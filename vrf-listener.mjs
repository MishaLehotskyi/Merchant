import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';
dotenv.config();

const abi = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'requestId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'randomWord', type: 'uint256' }
    ],
    name: 'RequestFulfilled',
    type: 'event'
  }
];

async function sendRandomNumber(number, transactionHash, isMega) {
    try {
      const res = await axios.post(
        'https://doubelgame.ru/api/game/apply-random',
        { number, transactionHash, isMega },
        {
          headers: {
            'x-ticket-secret': process.env.TICKET_SECRET,
          },
        }
      );
      console.log('✅ Ответ от сервера:', res.data);
    } catch (err) {
      console.error('❌ Ошибка отправки:', err.response?.data || err.message);
    }
  }

async function main() {
  const provider = new ethers.providers.WebSocketProvider('wss://bnb-mainnet.g.alchemy.com/v2/fPYbwiGPOIp69fN7Ngf66NgaUD_aev7B');
  const contract = new ethers.Contract('0x0d27ea65b4ccbd795783093946df8be6af93028f', abi, provider);

  console.log('🔍 Listening for RequestFulfilled events...');

  contract.on('RequestFulfilled', (requestId, randomWord, event) => {
    console.log('🎲 VRF Fulfilled!');
    sendRandomNumber(randomWord.toString(), event.transactionHash, false)
    console.log(`Request ID: ${requestId.toString()}`);
    console.log(`Random Word: ${randomWord.toString()}`);
    console.log(`🔗 Tx Hash: ${event.transactionHash}`);
    // Тут можно: отправить в Telegram, WebSocket, DB, и т.д.
  });
}

main();