import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'
import KipuBankABI from './contracts/KipuBankABI.json'

// Dirección del contrato desde las variables de entorno
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

function App() {
  // Estados principales
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [account, setAccount] = useState(null)
  
  // Estados de datos del contrato
  const [userBalance, setUserBalance] = useState("0")
  const [walletBalance, setWalletBalance] = useState("0")
  const [bankSummary, setBankSummary] = useState(null)
  const [contractOwner, setContractOwner] = useState("")
  const [isOwner, setIsOwner] = useState(false)
  
  // Estados de UI
  const [screen, setScreen] = useState("welcome")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [networkInfo, setNetworkInfo] = useState(null)
  
  // Estados específicos para owner
  const [ownerWithdrawAmount, setOwnerWithdrawAmount] = useState("")
  const [newOwnerAddress, setNewOwnerAddress] = useState("")
  const [ownerLoading, setOwnerLoading] = useState(false)

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
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, KipuBankABI, signer)
        
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
        
        await loadAllData(contract, address, provider)
      } else {
        setMessage("Por favor instala MetaMask")
      }
    } catch (error) {
      console.error("Error conectando wallet:", error)
      setMessage("Error conectando wallet: " + error.message)
    }
  }

  // Cargar todos los datos desde la blockchain
  const loadAllData = async (contractInstance, userAddress, providerInstance = provider) => {
    try {
      setLoading(true)
      setMessage("Cargando datos desde blockchain...")
      
      console.log("📡 Cargando todos los datos desde blockchain...")
      
      // 1. Balance de la wallet
      const walletBal = await providerInstance.getBalance(userAddress)
      const formattedWalletBal = ethers.formatEther(walletBal)
      setWalletBalance(formattedWalletBal)
      console.log("✅ Balance wallet:", formattedWalletBal, "ETH")
      
      // 2. Balance del usuario en el contrato
      const contractBalance = await contractInstance.getBalance(userAddress)
      const formattedContractBal = ethers.formatEther(contractBalance)
      setUserBalance(formattedContractBal)
      console.log("✅ Balance en contrato:", formattedContractBal, "ETH")
      
      // 3. Resumen completo del banco
      const summary = await contractInstance.summary()
      const bankData = {
        totalBankBalance: ethers.formatEther(summary[0]),
        totalDepositsCount: summary[1].toString(),
        totalWithdrawalsCount: summary[2].toString(),
        bankCap: ethers.formatEther(summary[3]),
        maxWithdrawalPerTx: ethers.formatEther(summary[4])
      }
      setBankSummary(bankData)
      console.log("✅ Resumen del banco:", bankData)
      
      // 4. Owner del contrato
      const owner = await contractInstance.owner()
      setContractOwner(owner)
      const userIsOwner = owner.toLowerCase() === userAddress.toLowerCase()
      setIsOwner(userIsOwner)
      console.log("✅ Owner del contrato:", owner, "¿Es owner el usuario?", userIsOwner)
      
      // 5. Contadores de usuario
      const userDeposits = await contractInstance.userDepositsCount(userAddress)
      const userWithdrawals = await contractInstance.userWithdrawalsCount(userAddress)
      console.log("✅ Depósitos del usuario:", userDeposits.toString())
      console.log("✅ Retiros del usuario:", userWithdrawals.toString())
      
      setMessage("")
    } catch (error) {
      console.error("❌ Error cargando datos:", error)
      setMessage("Error cargando datos: " + error.message)
    }
    setLoading(false)
  }

  // Depositar ETH
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

    // Verificar que el depósito no exceda la capacidad del banco
    if (bankSummary) {
      const newTotal = parseFloat(bankSummary.totalBankBalance) + parseFloat(amount)
      if (newTotal > parseFloat(bankSummary.bankCap)) {
        setMessage(`El depósito excedería la capacidad del banco. Máximo disponible: ${(parseFloat(bankSummary.bankCap) - parseFloat(bankSummary.totalBankBalance)).toFixed(4)} ETH`)
        return
      }
    }

    setLoading(true)
    try {
      setMessage("Preparando depósito...")
      
      const tx = await contract.deposit({
        value: ethers.parseEther(amount)
      })
      
      setMessage("Transacción enviada. Esperando confirmación...")
      console.log("Hash de transacción:", tx.hash)
      
      const receipt = await tx.wait()
      console.log("Transacción confirmada:", receipt)
      
      setMessage(`¡Depósito exitoso! ${amount} ETH depositados`)
      await loadAllData(contract, account)
      setAmount("")
      
      setTimeout(() => {
        setMessage("")
        setScreen("main")
      }, 3000)
    } catch (error) {
      console.error("Error completo en depósito:", error)
      let errorMessage = "Error en depósito: "
      
      if (error.reason) {
        errorMessage += error.reason
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transacción cancelada por el usuario"
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    }
    setLoading(false)
  }

  // Retirar ETH
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

    // Verificar que haya fondos reales en el banco
    if (bankSummary && parseFloat(bankSummary.totalBankBalance) === 0) {
      setMessage("❌ No hay fondos en el banco. El owner ha retirado todos los fondos.")
      return
    }

    // Verificar si hay suficientes fondos reales vs balance individual
    if (bankSummary && parseFloat(amount) > parseFloat(bankSummary.totalBankBalance)) {
      setMessage(`❌ Fondos insuficientes en el banco. Máximo disponible: ${parseFloat(bankSummary.totalBankBalance).toFixed(4)} ETH (Owner ha retirado fondos)`)
      return
    }

    // Verificar límites del contrato
    if (bankSummary && parseFloat(amount) > parseFloat(bankSummary.maxWithdrawalPerTx)) {
      setMessage(`Excede el máximo permitido por transacción: ${bankSummary.maxWithdrawalPerTx} ETH`)
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
      await loadAllData(contract, account)
      setAmount("")
      
      setTimeout(() => {
        setMessage("")
        setScreen("main")
      }, 3000)
    } catch (error) {
      console.error("Error completo en retiro:", error)
      let errorMessage = "Error en retiro: "
      
      if (error.reason) {
        errorMessage += error.reason
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transacción cancelada por el usuario"
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    }
    setLoading(false)
  }

  // Retiro del owner
  const handleOwnerWithdraw = async () => {
    if (!ownerWithdrawAmount || parseFloat(ownerWithdrawAmount) <= 0) {
      setMessage("Ingrese un monto válido")
      return
    }

    if (parseFloat(ownerWithdrawAmount) > parseFloat(bankSummary?.totalBankBalance || 0)) {
      setMessage("Monto excede el balance total del banco")
      return
    }

    setOwnerLoading(true)
    try {
      setMessage("Preparando retiro del owner...")
      
      const tx = await contract.ownerWithdrawFromBank(ethers.parseEther(ownerWithdrawAmount))
      
      setMessage("Transacción enviada. Esperando confirmación...")
      console.log("Hash de transacción owner withdraw:", tx.hash)
      
      const receipt = await tx.wait()
      console.log("Transacción confirmada:", receipt)
      
      setMessage(`¡Retiro de owner exitoso! ${ownerWithdrawAmount} ETH retirados del banco`)
      setOwnerWithdrawAmount("")
      
      await loadAllData(contract, account, provider)
      
      setTimeout(() => {
        setMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error en retiro de owner:", error)
      let errorMessage = "Error en retiro de owner: "
      
      if (error.message.includes("NotOwner")) {
        errorMessage += "Solo el owner puede realizar esta operación"
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transacción cancelada por el usuario"
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    }
    setOwnerLoading(false)
  }

  // Transferir ownership
  const handleTransferOwnership = async () => {
    if (!newOwnerAddress || !ethers.isAddress(newOwnerAddress)) {
      setMessage("Ingrese una dirección válida")
      return
    }

    if (newOwnerAddress.toLowerCase() === account.toLowerCase()) {
      setMessage("No puede transferir ownership a sí mismo")
      return
    }

    setOwnerLoading(true)
    try {
      setMessage("Preparando transferencia de ownership...")
      
      const tx = await contract.transferOwnership(newOwnerAddress)
      
      setMessage("Transacción enviada. Esperando confirmación...")
      console.log("Hash de transacción transfer ownership:", tx.hash)
      
      const receipt = await tx.wait()
      console.log("Transacción confirmada:", receipt)
      
      setMessage(`¡Ownership transferido exitosamente a ${newOwnerAddress}!`)
      setIsOwner(false)
      setNewOwnerAddress("")
      
      await loadAllData(contract, account, provider)
      
      setTimeout(() => {
        setMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error en transferencia de ownership:", error)
      let errorMessage = "Error en transferencia de ownership: "
      
      if (error.message.includes("NotOwner")) {
        errorMessage += "Solo el owner puede realizar esta operación"
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transacción cancelada por el usuario"
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    }
    setOwnerLoading(false)
  }

  // Renderizar pantalla de bienvenida
  const renderWelcomeScreen = () => (
    <div className="atm-screen">
      <div className="atm-header">
        <h1 className="bank-title">🏦 KIPU BANK</h1>
        <h2 className="screen-title">Bienvenido</h2>
        <p>Sistema de Banca Descentralizada</p>
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
          <h2>Cajero Automático Descentralizado</h2>
          <p>Conecte su wallet MetaMask para comenzar</p>
          <p>Red requerida: <strong>Sepolia Testnet</strong></p>
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
        {isOwner && <p style={{color: '#ffff00', fontWeight: 'bold'}}>👑 OWNER DEL CONTRATO</p>}
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
        <div className={`main-layout ${isOwner ? 'with-owner' : ''}`}>
          {/* Columna principal */}
          <div className="main-column">
            {/* Saldos */}
            <div className="balance-display">
              <h2>💰 Saldos de Cuenta</h2>
              <div className="balance-grid">
                <div className="balance-item wallet">
                  <span>👛 Balance en Wallet:</span>
                  <div className="balance-amount">{parseFloat(walletBalance).toFixed(4)} ETH</div>
                </div>
                {/* Mostrar balance individual solo si tiene fondos */}
                {parseFloat(userBalance) > 0 && (
                  <div className="balance-item user">
                    <span>🏦 Mis Depósitos en el Banco:</span>
                    <div className="balance-amount">{parseFloat(userBalance).toFixed(4)} ETH</div>
                    {/* Advertencia si hay inconsistencia (usuario tiene balance pero banco está vacío) */}
                    {bankSummary && parseFloat(bankSummary.totalBankBalance) === 0 && (
                      <div className="warning-notice">
                        ⚠️ <strong>Fondos no disponibles:</strong> El owner ha retirado los fondos del banco.
                        <br />
                        <small>No podrás retirar hasta que haya liquidez suficiente.</small>
                      </div>
                    )}
                    {/* Advertencia si balance individual excede el total del banco */}
                    {bankSummary && parseFloat(userBalance) > parseFloat(bankSummary.totalBankBalance) && parseFloat(bankSummary.totalBankBalance) > 0 && (
                      <div className="warning-notice">
                        ⚠️ <strong>Fondos parciales:</strong> Solo puedes retirar hasta {parseFloat(bankSummary.totalBankBalance).toFixed(4)} ETH.
                        <br />
                        <small>El owner ha retirado parte de los fondos del banco.</small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Estadísticas del banco */}
            {bankSummary && (
              <div className="bank-stats">
                <h3>📊 Estadísticas del Banco</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span>Balance Total del Banco:</span>
                    <div className="stat-value">{parseFloat(bankSummary.totalBankBalance).toFixed(4)} ETH</div>
                  </div>
                  <div className="stat-item">
                    <span>Capacidad Máxima:</span>
                    <div className="stat-value">{parseFloat(bankSummary.bankCap).toFixed(4)} ETH</div>
                  </div>
                  <div className="stat-item">
                    <span>Total Depósitos:</span>
                    <div className="stat-value">{bankSummary.totalDepositsCount}</div>
                  </div>
                  <div className="stat-item">
                    <span>Total Retiros:</span>
                    <div className="stat-value">{bankSummary.totalWithdrawalsCount}</div>
                  </div>
                  <div className="stat-item">
                    <span>Máximo Retiro por Tx:</span>
                    <div className="stat-value">{parseFloat(bankSummary.maxWithdrawalPerTx).toFixed(4)} ETH</div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="atm-buttons">
              <button className="atm-btn deposit" onClick={() => setScreen("deposit")}>
                💰 Depositar ETH
              </button>
              <button className="atm-btn withdraw" onClick={() => setScreen("withdraw")}>
                💸 Retirar ETH
              </button>
              <button className="atm-btn refresh" onClick={() => loadAllData(contract, account)} disabled={loading}>
                {loading ? "⏳ Actualizando..." : "🔄 Actualizar Datos"}
              </button>
            </div>
          </div>

          {/* Panel lateral del owner */}
          {isOwner && (
            <div className="owner-panel">
              <div className="owner-header">
                <h3>👑 PANEL DE ADMINISTRADOR</h3>
                <div className="owner-badge">Owner del Contrato</div>
              </div>
              
              <div className="owner-section">
                <h4>💸 Retirar del Banco</h4>
                <p>Balance disponible: <strong>{bankSummary ? parseFloat(bankSummary.totalBankBalance).toFixed(4) : '0'} ETH</strong></p>
                <input
                  type="number"
                  value={ownerWithdrawAmount}
                  onChange={(e) => setOwnerWithdrawAmount(e.target.value)}
                  placeholder="Cantidad en ETH"
                  step="0.000001"
                  min="0"
                  disabled={ownerLoading}
                  className="owner-input"
                />
                <button 
                  className="owner-btn withdraw" 
                  onClick={handleOwnerWithdraw}
                  disabled={ownerLoading || !ownerWithdrawAmount || parseFloat(ownerWithdrawAmount) <= 0}
                >
                  {ownerLoading ? "⏳ Procesando..." : "💸 Retirar"}
                </button>
              </div>

              <div className="owner-section">
                <h4>👑 Transferir Ownership</h4>
                <p>Owner actual: <small>{contractOwner}</small></p>
                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="Nueva dirección owner (0x...)"
                  disabled={ownerLoading}
                  className="owner-input"
                />
                <button 
                  className="owner-btn transfer" 
                  onClick={handleTransferOwnership}
                  disabled={ownerLoading || !newOwnerAddress}
                >
                  {ownerLoading ? "⏳ Procesando..." : "👑 Transferir"}
                </button>
              </div>
            </div>
          )}
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
      </div>
      <div className="atm-content">
        <div className="transaction-form">
          <div className="balance-info">
            <p>💰 Balance disponible en wallet: <strong>{parseFloat(walletBalance).toFixed(4)} ETH</strong></p>
            <p>🏦 Balance actual en el banco: <strong>{parseFloat(userBalance).toFixed(4)} ETH</strong></p>
            {bankSummary && (
              <p>📊 Capacidad disponible: <strong>{(parseFloat(bankSummary.bankCap) - parseFloat(bankSummary.totalBankBalance)).toFixed(4)} ETH</strong></p>
            )}
          </div>
          
          <div className="input-section">
            <label>Monto a depositar (ETH):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000001"
              step="0.000001"
              min="0"
              disabled={loading}
              className="amount-input"
            />
          </div>
          
          <div className="transaction-buttons">
            <button 
              className="atm-btn primary large" 
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? "⏳ Procesando..." : "✅ Confirmar Depósito"}
            </button>
            <button 
              className="atm-btn secondary" 
              onClick={() => {setScreen("main"); setAmount("")}}
              disabled={loading}
            >
              ← Volver al Menú
            </button>
          </div>
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
        <h2 className="screen-title">💸 Retirar ETH</h2>
      </div>
      <div className="atm-content">
        <div className="transaction-form">
          <div className="balance-info">
            <p>🏦 Tus depósitos en el banco: <strong>{parseFloat(userBalance).toFixed(4)} ETH</strong></p>
            {bankSummary && (
              <>
                <p>💰 Fondos reales disponibles: <strong>{parseFloat(bankSummary.totalBankBalance).toFixed(4)} ETH</strong></p>
                <p>⚠️ Máximo por retiro: <strong>{parseFloat(bankSummary.maxWithdrawalPerTx).toFixed(4)} ETH</strong></p>
                {parseFloat(userBalance) > 0 && parseFloat(bankSummary.totalBankBalance) === 0 && (
                  <div className="warning-notice">
                    ⚠️ <strong>Sin fondos:</strong> El owner ha retirado todos los fondos del banco.
                    <br />No puedes retirar en este momento.
                  </div>
                )}
                {parseFloat(userBalance) > parseFloat(bankSummary.totalBankBalance) && parseFloat(bankSummary.totalBankBalance) > 0 && (
                  <div className="warning-notice">
                    ⚠️ <strong>Fondos limitados:</strong> Solo puedes retirar hasta {parseFloat(bankSummary.totalBankBalance).toFixed(4)} ETH.
                    <br />El owner ha retirado parte de los fondos.
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="input-section">
            <label>Monto a retirar (ETH):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000001"
              step="0.000001"
              min="0"
              max={bankSummary ? parseFloat(bankSummary.maxWithdrawalPerTx) : undefined}
              disabled={loading}
              className="amount-input"
            />
          </div>
          
          <div className="transaction-buttons">
            <button 
              className="atm-btn primary large" 
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? "⏳ Procesando..." : "✅ Confirmar Retiro"}
            </button>
            <button 
              className="atm-btn secondary" 
              onClick={() => {setScreen("main"); setAmount("")}}
              disabled={loading}
            >
              ← Volver al Menú
            </button>
          </div>
        </div>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  )

  // Renderizar según pantalla actual
  if (screen === "welcome") {
    return renderWelcomeScreen()
  } else if (screen === "main") {
    return renderMainScreen()
  } else if (screen === "deposit") {
    return renderDepositScreen()
  } else if (screen === "withdraw") {
    return renderWithdrawScreen()
  }

  return <div>Pantalla desconocida</div>
}

export default App
