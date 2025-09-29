# 🏦 Kipu Bank - Cajero Automático Descentralizado

Una aplicación web que simula un cajero automático descentralizado construido con React y Web3, que permite a los usuarios depositar y retirar ETH de manera segura en la blockchain de Ethereum.

## ✨ Características

- 🔗 **Conexión con MetaMask**: Integración completa con la wallet MetaMask
- 💰 **Depósitos de ETH**: Deposita ETH desde tu wallet al contrato inteligente
- 💸 **Retiros seguros**: Retira ETH del contrato a tu wallet
- 📊 **Estadísticas en tiempo real**: Visualiza estadísticas del sistema bancario
- 🎨 **Interfaz tipo Terminal**: Diseño retro inspirado en cajeros automáticos clásicos
- 📱 **Responsive**: Funciona perfectamente en desktop y móviles
- 🌐 **Red Sepolia**: Funciona en la testnet de Ethereum Sepolia

## 🚀 Tecnologías Utilizadas

- **Frontend**: React 18 + Vite
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Web3**: ethers.js v6
- **Estilos**: CSS personalizado con efectos terminal
- **Wallet**: MetaMask

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión 16 o superior)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)
- [MetaMask](https://metamask.io/) instalado en tu navegador
- ETH de prueba en Sepolia Testnet

## ⚙️ Instalación

1. **Clona el repositorio**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd kipu_bank_front
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```bash
   VITE_CONTRACT_ADDRESS=0xTU_DIRECCION_DEL_CONTRATO
   ```
   
   Reemplaza `0xTU_DIRECCION_DEL_CONTRATO` con la dirección real del contrato desplegado.

4. **Inicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abre tu navegador**
   
   Ve a `http://localhost:5173`

## 🌐 Configuración de Red

### Sepolia Testnet
La aplicación está configurada para funcionar con Sepolia Testnet. Configura MetaMask:

- **Nombre de red**: Sepolia test network
- **RPC URL**: `https://sepolia.infura.io/v3/[TU_API_KEY]` o usar la RPC pública
- **Chain ID**: 11155111
- **Símbolo**: ETH
- **Explorador**: https://sepolia.etherscan.io

### Obtener ETH de Prueba
Obtén ETH gratis para pruebas en:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)

## 📖 Cómo Usar

1. **Conectar Wallet**
   - Abre la aplicación
   - Haz clic en "Conectar Wallet MetaMask"
   - Autoriza la conexión en MetaMask

2. **Realizar Depósito**
   - Ve al menú principal
   - Selecciona "Depositar ETH"
   - Ingresa la cantidad (ej: 0.001)
   - Confirma la transacción en MetaMask

3. **Realizar Retiro**
   - Selecciona "Retirar ETH"
   - Ingresa la cantidad a retirar
   - Confirma la transacción en MetaMask

4. **Ver Estadísticas**
   - Selecciona "Estadísticas"
   - Observa datos del sistema bancario

## 🏗️ Estructura del Proyecto

```
kipu_bank_front/
├── src/
│   ├── App.jsx          # Componente principal
│   ├── App.css          # Estilos principales
│   ├── main.jsx         # Punto de entrada
│   └── contracts/       # ABIs de contratos
├── public/              # Archivos estáticos
├── .env                 # Variables de entorno
└── package.json         # Dependencias
```

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run preview` - Previsualiza el build de producción
- `npm run lint` - Ejecuta ESLint

## 🛡️ Seguridad

⚠️ **Advertencias importantes:**
- Esta es una aplicación de prueba en testnet
- No uses ETH real, solo de prueba
- Revisa siempre las transacciones antes de confirmar
- El contrato debe estar auditado antes de usar en mainnet

## 🐛 Solución de Problemas

### Error de Red
```
Por favor cambie a la red Sepolia Testnet
```
**Solución**: Cambia la red en MetaMask a Sepolia.

### Error de Contrato
```
Error: Debe configurar VITE_CONTRACT_ADDRESS
```
**Solución**: Agrega la dirección del contrato en el archivo `.env`.

### Fondos Insuficientes
```
Fondos insuficientes para la transacción
```
**Solución**: Obtén más ETH de prueba de un faucet.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🔗 Enlaces Útiles

- [Documentación de ethers.js](https://docs.ethers.io/v6/)
- [MetaMask Developer Docs](https://docs.metamask.io/)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- [Ethereum Developer Resources](https://ethereum.org/en/developers/)

## 📞 Soporte

Si tienes alguna pregunta o problema:
- Abre un issue en GitHub
- Revisa la documentación de MetaMask
- Consulta los logs de la consola del navegador

---

**⚡ ¡Disfruta usando Kipu Bank y explora el mundo de DeFi de manera segura!**
