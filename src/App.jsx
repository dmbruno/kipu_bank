import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'

// ABI completo del contrato KipuBank
const KIPU_BANK_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function getBalance(address user) external view returns (uint256)",
  "function summary() external view returns (uint256, uint256, uint256, uint256, uint256)",
  "function totalBankBalance() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function bankCap() external view returns (uint256)",
  "function maxWithdrawalPerTx() external view returns (uint256)",
  "function userDepositsCount(address) external view returns (uint256)",
  "function userWithdrawalsCount(address) external view returns (uint256)",
  "event Deposit(address indexed user, uint256 amount, uint256 newBalance, uint256 depositIndex)",
  "event Withdrawal(address indexed user, uint256 amount, uint256 newBalance, uint256 withdrawalIndex)"
]

// Dirección del contrato desde las variables de entorno
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [account, setAccount] = useState(null)
  const [userBalance, setUserBalance] = useState("0")
  const [walletBalance, setWalletBalance] = useState("0")
  const [bankSummary, setBankSummary] = useState(null)
  const [screen, setScreen] = useState("welcome")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [networkInfo, setNetworkInfo] = useState(null)

  // Conectar a MetaMask
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum)
        
        // Solicitar conexión
        await provider.send("eth_requestAccounts", [])
        
        // Verificar red
        const network = await provider.getNetwork()
        console.log("Red conectada:", network)
        
        // Verificar que estemos en Sepolia (chainId: 11155111)
        if (network.chainId !== 11155111n) {
          setMessage("Por favor cambie a la red Sepolia Testnet")
          return
        }
        
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        
        // Verificar dirección del contrato
        if (!CONTRACT_ADDRESS) {
          setMessage("Error: Debe configurar VITE_CONTRACT_ADDRESS en el archivo .env")
          return
        }
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, KIPU_BANK_ABI, signer)
        
        setProvider(provider)
        setSigner(signer)
        setContract(contract)
        setAccount(address)
        setNetworkInfo({
          name: network.name,
          chainId: network.chainId.toString()
        })
        setScreen("main")
        setMessage("¡Conectado exitosamente a Sepolia!")
        
        await loadUserData(contract, address, provider)
      } else {
        setMessage("Por favor instala MetaMask")
      }
    } catch (error) {
      console.error("Error conectando wallet:", error)
      setMessage("Error conectando wallet: " + error.message)
    }
  }

  // Cargar datos del usuario
  const loadUserData = async (contractInstance, userAddress, providerInstance = provider) => {
    try {
      setLoading(true)
      setMessage("Cargando datos...")
      
      // Balance de la wallet
      const walletBal = await providerInstance.getBalance(userAddress)
      setWalletBalance(ethers.formatEther(walletBal))
      
      // Balance en el contrato
      const contractBalance = await contractInstance.getBalance(userAddress)
      setUserBalance(ethers.formatEther(contractBalance))
      
      // Resumen del banco
      const summary = await contractInstance.summary()
      setBankSummary({
        totalBalance: ethers.formatEther(summary[0]),
        totalDeposits: summary[1].toString(),
        totalWithdrawals: summary[2].toString(),
        bankCap: ethers.formatEther(summary[3]),
        maxWithdraw: ethers.formatEther(summary[4])
      })
      
      setMessage("")
    } catch (error) {
      console.error("Error cargando datos:", error)
      setMessage("Error cargando datos: " + error.message)
    }
    setLoading(false)
  }

  // Depositar
  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage("Ingrese un monto válido")
      return
    }

    // Verificar que el usuario tenga suficiente saldo
    if (parseFloat(amount) > parseFloat(walletBalance)) {
      setMessage("Saldo insuficiente en la wallet")
      return
    }

    setLoading(true)
    try {
      setMessage("Preparando transacción...")
      
      const tx = await contract.deposit({
        value: ethers.parseEther(amount)
      })
      
      setMessage("Transacción enviada. Esperando confirmación...")
      console.log("Hash de transacción:", tx.hash)
      
      const receipt = await tx.wait()
      console.log("Transacción confirmada:", receipt)
      
      setMessage(`¡Depósito exitoso! ${amount} ETH depositados`)
      await loadUserData(contract, account)
      setAmount("")
      
      setTimeout(() => {
        setMessage("")
        setScreen("main")
      }, 3000)
    } catch (error) {
      console.error("Error en depósito:", error)
      let errorMessage = "Error en depósito: "
      
      if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage += "Fondos insuficientes para la transacción"
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transacción cancelada por el usuario"
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    }
    setLoading(false)
  }

  // Retirar
  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage("Ingrese un monto válido")
      return
    }

    // Verificar que el usuario tenga suficiente saldo en el contrato
    if (parseFloat(amount) > parseFloat(userBalance)) {
      setMessage("Saldo insuficiente en el contrato")
      return
    }

    setLoading(true)
    try {
      setMessage("Preparando retiro...")
      
      const tx = await contract.withdraw(ethers.parseEther(amount))
      
      setMessage("Transacción enviada. Esperando confirmación...")
      console.log("Hash de transacción:", tx.hash)
      
      const receipt = await tx.wait()
      console.log("Transacción confirmada:", receipt)
      
      setMessage(`¡Retiro exitoso! ${amount} ETH retirados`)
      await loadUserData(contract, account)
      setAmount("")
      
      setTimeout(() => {
        setMessage("")
        setScreen("main")
      }, 3000)
    } catch (error) {
      console.error("Error en retiro:", error)
      let errorMessage = "Error en retiro: "
      
      if (error.message.includes("InsufficientBalance")) {
        errorMessage += "Saldo insuficiente en el contrato"
      } else if (error.message.includes("ExceedsMaxWithdrawal")) {
        errorMessage += "Excede el máximo permitido por transacción"
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transacción cancelada por el usuario"
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    }
    setLoading(false)
  }

  // Renderizar pantalla de bienvenida
  const renderWelcomeScreen = () => (
    <div className="atm-screen">
      <div className="atm-header">
        <h1 className="bank-title">🏦 KIPU BANK</h1>
        <h2 className="screen-title">Bienvenido</h2>
        <p>Cajero Automático Descentralizado</p>
        {CONTRACT_ADDRESS && (
          <div className="contract-info">
            <p>Contrato:</p>
            <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
        )}
      </div>
      <div className="atm-content">
        <div className="welcome-message">
          <h2>Sistema de Banca Descentralizada</h2>
          <p>Conecte su wallet MetaMask para comenzar</p>
          <p>Red requerida: Sepolia Testnet</p>
        </div>
        <div className="atm-buttons single-column">
          <button className="atm-btn primary" onClick={connectWallet}>
            🔗 Conectar Wallet MetaMask
          </button>
        </div>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  )

  // Renderizar menú principal
  const renderMainScreen = () => (
    <div className="atm-screen">
      <div className="atm-header">
        <h1 className="bank-title">🏦 KIPU BANK</h1>
        <h2 className="screen-title">Panel Principal</h2>
        <p>Cuenta: {account?.slice(0, 6)}...{account?.slice(-4)}</p>
        {networkInfo && <p>Red: {networkInfo.name}</p>}
        {CONTRACT_ADDRESS && (
          <div className="contract-info">
            <p>Contrato:</p>
            <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
        )}
      </div>
      <div className="atm-content">
        <div className="balance-display">
          <h2>Saldos de Cuenta</h2>
          <div className="balance-item">
            <span>💰 Depositado en el Banco:</span>
            <div className="balance-amount">{parseFloat(userBalance).toFixed(4)} ETH</div>
          </div>
          <div className="balance-item wallet-balance">
            <span>👛 Disponible en Wallet:</span>
            <div className="wallet-amount">{parseFloat(walletBalance).toFixed(4)} ETH</div>
          </div>
        </div>
        <div className="atm-buttons">
          <button className="atm-btn" onClick={() => setScreen("deposit")}>
            💰 Depositar ETH
          </button>
          <button className="atm-btn" onClick={() => setScreen("withdraw")}>
            💸 Retirar ETH
          </button>
          <button className="atm-btn" onClick={() => setScreen("summary")}>
            📊 Estadísticas
          </button>
          <button className="atm-btn" onClick={() => loadUserData(contract, account)} disabled={loading}>
            {loading ? "⏳ Cargando..." : "🔄 Actualizar"}
          </button>
        </div>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  )

  // Renderizar pantalla de depósito
  const renderDepositScreen = () => (
    <div className="atm-screen">
      <div className="atm-header">
        <h1 className="bank-title">🏦 KIPU BANK</h1>
        <h2 className="screen-title">💰 Realizar Depósito</h2>
        {CONTRACT_ADDRESS && (
          <div className="contract-info">
            <p>Contrato:</p>
            <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
        )}
      </div>
      <div className="atm-content">
        <div className="balance-info">
          <p>💰 Saldo disponible en wallet: {parseFloat(walletBalance).toFixed(4)} ETH</p>
        </div>
        <div className="input-section">
          <label>Monto a depositar (ETH):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.001"
            min="0"
            disabled={loading}
          />
        </div>
        <div className="atm-buttons">
          <button 
            className="atm-btn primary" 
            onClick={handleDeposit}
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            {loading ? "⏳ Procesando..." : "✅ Confirmar Depósito"}
          </button>
          <button className="atm-btn" onClick={() => {setScreen("main"); setAmount(""); setMessage("")}}>
            ← Volver al Menú
          </button>
        </div>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  )

  // Renderizar pantalla de retiro
  const renderWithdrawScreen = () => (
    <div className="atm-screen">
      <div className="atm-header">
        <h1 className="bank-title">🏦 KIPU BANK</h1>
        <h2 className="screen-title">💸 Realizar Retiro</h2>
        {CONTRACT_ADDRESS && (
          <div className="contract-info">
            <p>Contrato:</p>
            <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
        )}
      </div>
      <div className="atm-content">
        <div className="balance-info">
          <p>💰 Saldo disponible en el banco: {parseFloat(userBalance).toFixed(4)} ETH</p>
          {bankSummary && (
            <p>⚠️ Máximo por transacción: {parseFloat(bankSummary.maxWithdraw).toFixed(4)} ETH</p>
          )}
        </div>
        <div className="input-section">
          <label>Monto a retirar (ETH):</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.001"
            min="0"
            max={parseFloat(userBalance)}
            disabled={loading}
          />
        </div>
        <div className="atm-buttons">
          <button 
            className="atm-btn primary" 
            onClick={handleWithdraw}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(userBalance)}
          >
            {loading ? "⏳ Procesando..." : "✅ Confirmar Retiro"}
          </button>
          <button className="atm-btn" onClick={() => {setScreen("main"); setAmount(""); setMessage("")}}>
            ← Volver al Menú
          </button>
        </div>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  )

  // Renderizar resumen del banco
  const renderSummaryScreen = () => (
    <div className="atm-screen">
      <div className="atm-header">
        <h1 className="bank-title">🏦 KIPU BANK</h1>
        <h2 className="screen-title">📊 Estadísticas del Sistema</h2>
        {CONTRACT_ADDRESS && (
          <div className="contract-info">
            <p>Contrato:</p>
            <a 
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
        )}
      </div>
      <div className="atm-content">
        {bankSummary && (
          <div className="summary-info">
            <div className="summary-item">
              <span>💰 Balance Total del Sistema:</span>
              <span>{parseFloat(bankSummary.totalBalance).toFixed(4)} ETH</span>
            </div>
            <div className="summary-item">
              <span>📥 Total de Depósitos Realizados:</span>
              <span>{bankSummary.totalDeposits} transacciones</span>
            </div>
            <div className="summary-item">
              <span>📤 Total de Retiros Realizados:</span>
              <span>{bankSummary.totalWithdrawals} transacciones</span>
            </div>
            <div className="summary-item">
              <span>🏛️ Capacidad Máxima del Sistema:</span>
              <span>{parseFloat(bankSummary.bankCap).toFixed(4)} ETH</span>
            </div>
            <div className="summary-item">
              <span>⚠️ Límite Máximo por Retiro:</span>
              <span>{parseFloat(bankSummary.maxWithdraw).toFixed(4)} ETH</span>
            </div>
            <div className="summary-item">
              <span>📈 Utilización del Sistema:</span>
              <span>{((parseFloat(bankSummary.totalBalance) / parseFloat(bankSummary.bankCap)) * 100).toFixed(2)}%</span>
            </div>
          </div>
        )}
        <div className="atm-buttons single-column">
          <button className="atm-btn" onClick={() => setScreen("main")}>
            ← Volver al Panel Principal
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="atm-container">
      {screen === "welcome" && renderWelcomeScreen()}
      {screen === "main" && renderMainScreen()}
      {screen === "deposit" && renderDepositScreen()}
      {screen === "withdraw" && renderWithdrawScreen()}
      {screen === "summary" && renderSummaryScreen()}
    </div>
  )
}

export default App