import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org');

const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const usdtAddress = '0x55d398326f99059fF775485246999027B3197955';
const tokenAddress = '0x86Aa748baC7BDe8Cd1A7bEf7236Ab4279554b6B6';

const routerAbi = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)'
];

const erc20Abi = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

const PRIVATE_KEYS = [
  process.env.PRIVATE_KEY,
  process.env.PRIVATE_KEY_2,
  process.env.PRIVATE_KEY_3,
  process.env.PRIVATE_KEY_4
];

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function sleepMinutes(min, max) {
  const ms = (Math.floor(Math.random() * (max - min + 1)) + min) * 60_000;
  return sleep(ms);
}

function generateSplitAmount(total, parts) {
  const raw = Array.from({ length: parts }, () => Math.random() * total);
  const scale = total / raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map(n => parseFloat((n * scale).toFixed(2)));
  const diff = +(total - scaled.reduce((a, b) => a + b, 0)).toFixed(2);
  scaled[scaled.length - 1] += diff;
  return scaled;
}

function insertMultipleSells(array, count = 3) {
  const result = [...array];
  const usedIndexes = new Set();
  while (count > 0) {
    const index = Math.floor(Math.random() * result.length);
    if (!usedIndexes.has(index)) {
      usedIndexes.add(index);
      result.splice(index, 0, 'SELL');
      count--;
    }
  }
  return result;
}

async function approveIfNeeded(contract, owner, label) {
  const allowance = await contract.allowance(owner, routerAddress);
  if (allowance.lt(ethers.constants.MaxUint256.div(2))) {
    const tx = await contract.approve(routerAddress, ethers.constants.MaxUint256);
    await tx.wait();
    console.log(`✅ ${label} approved`);
  }
}

async function sellTokens(wallet, amountUSDT) {
  const router = new ethers.Contract(routerAddress, routerAbi, wallet);
  const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);

  const pathToToken = [usdtAddress, tokenAddress];
  const pathToUSDT = [tokenAddress, usdtAddress];
  const deadline = Math.floor(Date.now() / 1000) + 300;

  const amounts = await router.getAmountsOut(ethers.utils.parseUnits(amountUSDT.toString(), 18), pathToToken);
  const tokenAmountToSell = amounts[1];

  await approveIfNeeded(token, wallet.address, 'TOKEN');

  const tx = await router.swapExactTokensForTokens(tokenAmountToSell, 0, pathToUSDT, wallet.address, deadline);
  await tx.wait();
  console.log(`🔴 [${wallet.address}] Продано на ${amountUSDT} USDT`);
}

async function buyTokens(wallet, amountUSDT) {
  const router = new ethers.Contract(routerAddress, routerAbi, wallet);
  const usdt = new ethers.Contract(usdtAddress, erc20Abi, wallet);

  const path = [usdtAddress, tokenAddress];
  const deadline = Math.floor(Date.now() / 1000) + 300;

  await approveIfNeeded(usdt, wallet.address, 'USDT');

  const tx = await router.swapExactTokensForTokens(
    ethers.utils.parseUnits(amountUSDT.toString(), 18),
    0,
    path,
    wallet.address,
    deadline
  );
  await tx.wait();
  console.log(`🟢 [${wallet.address}] Куплено на ${amountUSDT} USDT`);
}

async function runWalletBot(privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`🚀 Старт торговли для: ${wallet.address}`);

  const total = +(Math.random() * 20 + 30).toFixed(2);
  const parts = Math.floor(Math.random() * 6 + 5);
  const sequence = insertMultipleSells(generateSplitAmount(total, parts), 3);

  for (const item of sequence) {
    if (item === 'SELL') {
      await sellTokens(wallet, total / 3);
    } else {
      await buyTokens(wallet, item);
    }

    await sleepMinutes(5, 15);
  }

  console.log(`✅ Завершено: ${wallet.address}`);
}

async function main() {
  for (const key of PRIVATE_KEYS) {
    runWalletBot(key);
  }
}

main();
