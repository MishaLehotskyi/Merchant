import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';
dotenv.config();

// --- Chainlink VRF ABI ---
const vrfAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'requestId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'randomWord', type: 'uint256' },
    ],
    name: 'RequestFulfilled',
    type: 'event',
  },
];

const tokenAbi = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const ALCHEMY_WSS = 'wss://bnb-mainnet.g.alchemy.com/v2/fPYbwiGPOIp69fN7Ngf66NgaUD_aev7B';
const provider = new ethers.providers.WebSocketProvider(ALCHEMY_WSS);

const ws = provider._websocket;

ws.on('open', () => {
  console.log('✅ WebSocket открыт');
});

ws.on('ping', () => {
  console.log('📡 Ping от сервера');
});

ws.on('pong', () => {
  console.log('📡 Pong от сервера');
});

ws.on('unexpected-response', (req, res) => {
  console.error('⚠️ Unexpected response:', res.statusCode, res.statusMessage);
});

ws.on('close', (code, reason) => {
  console.error('🔌 WebSocket закрыт');
  console.error(`📄 Код: ${code}`);
  console.error(`📝 Причина: ${reason?.toString() || '[не указана]'}`);
  console.error(`🕓 Время: ${new Date().toISOString()}`);
  setTimeout(startListening, 1000);
});

ws.on('error', (err) => {
  console.error('🧨 WebSocket ошибка:', err.message);
  console.error(err);
});

const contractsToWatch = [
  { address: '0x0d27ea65b4ccbd795783093946df8be6af93028f', isMega: false }, // Standard
  { address: '0xbea919e1a4410c06c649f70f2a9b5b36d985f248', isMega: true },  // Mega
];

const tokenAddress = '0x86Aa748baC7BDe8Cd1A7bEf7236Ab4279554b6B6';
const MINI_ADDRESS = '0x62939d201C1c4beFbA34A1DFE85f35B64bc1BcfB'.toLowerCase();
const STANDARD_ADDRESS = '0x0A59e974890265660BC9f3c2182e5cAA9c036723'.toLowerCase();
const MEGA_ADDRESS = '0x740B45a8E7C01AAFC6CD823e5a794F172eE9cCD0'.toLowerCase();

async function sendRandomNumber(number, transactionHash, isMega) {
  try {
    const res = await axios.post(
      'https://doubelgame.ru/api/game/apply-random',
      { number, transactionHash, isMega },
      { headers: { 'x-ticket-secret': process.env.TICKET_SECRET } }
    );
    console.log('✅ Ответ от сервера:', res.data);
  } catch (err) {
    console.error('❌ Ошибка отправки:', err.response?.data || err.message);
  }
}

async function handleTicketCreation(gameType, metamaskId) {
  try {
    const gameResponse = await axios.get(`https://doubelgame.ru/api/game/latest/${gameType}`);
    const gameId = gameResponse.data.id;

    const res = await axios.post(
      'https://doubelgame.ru/api/ticket',
      { gameId, metamaskId },
      { headers: { 'x-ticket-secret': process.env.TICKET_SECRET } }
    );

    console.log(`🎟 Тикет создан для ${metamaskId} в игре ${gameType}`);
  } catch (error) {
    console.error('❌ Ошибка создания тикета:', error.message || error);
  }
}

function startListening() {
  console.log('🔁 Запуск слушателей...');

  contractsToWatch.forEach(({ address, isMega }) => {
    const contract = new ethers.Contract(address, vrfAbi, provider);

    contract.on('RequestFulfilled', async (requestId, randomWord, event) => {
      try {
        console.log(`🎲 VRF Event от ${address}`);
        console.log(`🔢 Random: ${randomWord.toString()}`);
        console.log(`🔗 Tx: ${event.transactionHash}`);
        await sendRandomNumber(randomWord.toString(), event.transactionHash, isMega);
      } catch (err) {
        console.error('⚠️ Ошибка VRF обработчика:', err.message || err);
      }
    });
  });

  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  tokenContract.on('Transfer', async (from, to, value, event) => {
    try {
      const toAddress = to.toLowerCase();
      const amount = BigInt(value.toString());
      const metamaskId = from.toLowerCase();

      if (toAddress === MINI_ADDRESS && amount === 100n * 10n ** 18n) {
        await handleTicketCreation('MINI', metamaskId);
      } else if (toAddress === STANDARD_ADDRESS && amount === 500n * 10n ** 18n) {
        await handleTicketCreation('STANDARD', metamaskId);
      } else if (toAddress === MEGA_ADDRESS && amount === 500n * 10n ** 18n) {
        await handleTicketCreation('MEGA', metamaskId);
      }
    } catch (err) {
      console.error('❌ Ошибка Transfer обработчика:', err.message || err);
    }
  });

  provider._websocket.on('close', (code, reason) => {
    console.error(`🔌 WebSocket закрыт`);
    console.error(`📄 Код: ${code}`);
    console.error(`📝 Причина: ${reason?.toString()}`);
    setTimeout(startListening, 1000);
  });

  provider._websocket.on('error', (err) => {
    console.error('🧨 WebSocket ошибка:', err.message);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('🚨 Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
});

startListening();