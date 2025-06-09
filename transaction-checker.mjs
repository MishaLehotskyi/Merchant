import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// WebSocket провайдер от BSC
const provider = new ethers.providers.WebSocketProvider('wss://bnb-mainnet.g.alchemy.com/v2/fPYbwiGPOIp69fN7Ngf66NgaUD_aev7B');

// Адрес токена Binance-Peg USDT (в сети BSC)
const tokenAddress = '0x86Aa748baC7BDe8Cd1A7bEf7236Ab4279554b6B6';

// Твой кошелек
const MINI_ADDRESS = '0x62939d201C1c4beFbA34A1DFE85f35B64bc1BcfB'.toLowerCase()
const STANDARD_ADDRESS = '0x0A59e974890265660BC9f3c2182e5cAA9c036723'.toLowerCase()
const MEGA_ADDRESS = '0x740B45a8E7C01AAFC6CD823e5a794F172eE9cCD0'.toLowerCase()

// ABI события Transfer
const tokenAbi = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Контракт токена
const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
console.log('start');

// Подписка на события Transfer
tokenContract.on('Transfer', async (from, to, value, event) => {
    console.log(from, to, value)
    const toAddress = to.toLowerCase()
    const amount = BigInt(Number(value).toString())
    console.log(amount, 100n * 10n ** 18n, amount === 100n * 10n ** 18n)
  
    // адрес отправителя в Metamask (кому принадлежит билет)
    const metamaskId = from.toLowerCase()
  
    try {
      if (toAddress === MINI_ADDRESS && amount === 100n * 10n ** 18n) {
        await handleTicketCreation('MINI', metamaskId)
      } else if (toAddress === STANDARD_ADDRESS && amount === 500n * 10n ** 18n) {
        await handleTicketCreation('STANDARD', metamaskId)
      } else if (toAddress === MEGA_ADDRESS && amount === 500n * 10n ** 18n) {
        await handleTicketCreation('MEGA', metamaskId)
      }
    } catch (err) {
      console.error('❌ Ошибка при создании тикета:', err.message || err)
    }
  })
  
  // 🔁 функция получения последней игры и создания тикета
  async function handleTicketCreation(gameType, metamaskId) {
    // получаем последнюю игру указанного типа
    const gameResponse = await axios.get(`https://doubelgame.ru/api/game/latest/${gameType}`)
    console.log(gameResponse, gameResponse.data.id, process.env.TICKET_SECRET)
    const gameId = gameResponse.data.id
  
    // создаем тикет
    try {
        const res = await axios.post(
            'https://doubelgame.ru/api/ticket',
            {
              gameId,
              metamaskId,
            },
            {
              headers: {
                'x-ticket-secret': process.env.TICKET_SECRET, // 🔐 защита по секрету
              },
            }
          )

        console.log(res)
    } catch (error) {
        console.log(error)
    }
    
  
    console.log(`🎟 Тикет создан для ${metamaskId} в игре ${gameType}`)
  }
