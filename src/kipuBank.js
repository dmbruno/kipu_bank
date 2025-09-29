import { ethers } from 'ethers';
import KipuBankABI from './contracts/KipuBankABI.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export const getContract = () => {
  if (!window.ethereum) {
    throw new Error('Metamask no está instalado');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, KipuBankABI, signer);
};