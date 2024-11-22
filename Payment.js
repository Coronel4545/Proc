const CONTRACT_ADDRESS = '0xE32B23224204fCE45d870A18565030125a2f4508';
const RAM_TOKEN_ADDRESS = '0xDc42Aa304aC19F502179d63A5C8AE0f0d5c9030F';
const REQUIRED_AMOUNT = '1500000000000000000000'; // 1500 tokens com 18 decimais

const TOKEN_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address", 
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

class PaymentProcessor {
    constructor() {
        this.loadingDiv = document.createElement('div');
        this.loadingDiv.id = 'loading-div';
        document.body.appendChild(this.loadingDiv);
        
        this.sheepSound = document.getElementById('ovelha-sound');
        this.web3 = null;
        this.userAddress = null;
        this.centerBottomBtn = document.getElementById('center-bottom-btn');
        
        // Adiciona o listener diretamente
        this.centerBottomBtn.addEventListener('click', () => {
            console.log('Botão clicado');
            this.realizarPagamento();
        });
    }

    async init() {
        try {
            console.log('Iniciando conexão com MetaMask...');
            if (typeof window.ethereum !== 'undefined') {
                // Solicita conexão com a carteira
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                this.web3 = new Web3(window.ethereum);
                this.userAddress = accounts[0];
                
                const chainId = await this.web3.eth.getChainId();
                console.log('Chain ID:', chainId);
                
                if (chainId !== 97) {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x61' }],
                    });
                }
                
                this.centerBottomBtn.disabled = false;
                console.log('Carteira conectada:', this.userAddress);
            } else {
                throw new Error('MetaMask não encontrada!');
            }
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showError('Erro ao conectar: ' + error.message);
            this.centerBottomBtn.disabled = true;
        }
    }

    async realizarPagamento() {
        console.log('Iniciando processo de pagamento...');
        try {
            if (!this.web3 || !this.userAddress) {
                console.log('Reconectando carteira...');
                await this.init();
            }

            this.centerBottomBtn.disabled = true;
            this.showLoading();
            
            console.log('Criando contrato do token...');
            const tokenContract = new this.web3.eth.Contract(
                TOKEN_ABI,
                RAM_TOKEN_ADDRESS
            );

            console.log('Verificando saldo...');
            const saldo = await tokenContract.methods.balanceOf(this.userAddress).call();
            console.log('Saldo atual:', saldo);
            
            if (BigInt(saldo) < BigInt(REQUIRED_AMOUNT)) {
                throw new Error('Saldo RAM insuficiente');
            }

            console.log('Solicitando aprovação...');
            const approvalTx = await tokenContract.methods.approve(CONTRACT_ADDRESS, REQUIRED_AMOUNT)
                .send({
                    from: this.userAddress
                });

            console.log('Aprovação concluída:', approvalTx);

            console.log('Tokens aprovados, realizando pagamento...');
            const paymentTx = await tokenContract.methods.transfer(CONTRACT_ADDRESS, REQUIRED_AMOUNT)
                .send({
                    from: this.userAddress
                });

            if (paymentTx.status) {
                console.log('Pagamento realizado com sucesso!');
                this.sheepSound.play();
                this.showSuccess();
                
                // Solicita URL à API
                const response = await fetch('https://back-end-flzz.onrender.com/api/get-website', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        transactionHash: paymentTx.transactionHash
                    })
                });

                const data = await response.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('URL não encontrada');
                }
            } else {
                throw new Error('Transação falhou');
            }

        } catch (error) {
            console.error('Erro durante o pagamento:', error);
            this.showError('Erro no pagamento: ' + error.message);
        } finally {
            this.hideLoading();
            this.centerBottomBtn.disabled = false;
        }
    }

    showLoading() {
        this.loadingDiv.innerHTML = `
            <div class="loading-container">
                <div class="dancing-sheep-container">
                    <img src="imagem/RAM.jpg" class="dancing-sheep" />
                    <img src="imagem/RAM.jpg" class="dancing-sheep" />
                    <img src="imagem/RAM.jpg" class="dancing-sheep" />
                </div>
                <p>Processando pagamento...</p>
            </div>
        `;
        this.loadingDiv.style.display = 'block';
    }

    showSuccess() {
        this.loadingDiv.innerHTML = `
            <div class="success-container">
                <div class="dancing-sheep-container">
                    <img src="imagem/RAM.jpg" class="dancing-sheep" />
                    <img src="imagem/RAM.jpg" class="dancing-sheep" />
                    <img src="imagem/RAM.jpg" class="dancing-sheep" />
                </div>
                <p>Pagamento realizado com sucesso!</p>
            </div>
        `;
    }

    showError(message) {
        this.loadingDiv.innerHTML = `
            <div class="error-container">
                <img src="imagem/RAM.jpg" class="sad-sheep" />
                <p>${message}</p>
            </div>
        `;
    }

    hideLoading() {
        setTimeout(() => {
            this.loadingDiv.style.display = 'none';
        }, 3000);
    }

    async displayGasEstimate() {
        try {
            const gasPrice = await this.web3.eth.getGasPrice();
            const gasEstimateTotal = await this.estimateTotalGas();
            const totalCostWei = BigInt(gasPrice) * BigInt(gasEstimateTotal);
            const totalCostBNB = this.web3.utils.fromWei(totalCostWei.toString(), 'ether');
            
            document.getElementById('gas-estimate').textContent = 
                `Custo estimado: ${totalCostBNB} BNB`;
        } catch (error) {
            console.error('Erro ao calcular estimativa:', error);
        }
    }

    async estimateTotalGas() {
        const tokenContract = new this.web3.eth.Contract(TOKEN_ABI, RAM_TOKEN_ADDRESS);
        
        const approveGas = await tokenContract.methods.approve(CONTRACT_ADDRESS, REQUIRED_AMOUNT)
            .estimateGas({ from: this.userAddress });
        const transferGas = await tokenContract.methods.transfer(CONTRACT_ADDRESS, REQUIRED_AMOUNT)
            .estimateGas({ from: this.userAddress });
            
        return approveGas + transferGas;
    }
}

// Inicialização correta
document.addEventListener('DOMContentLoaded', async () => {
    const processor = new PaymentProcessor();
    await processor.init();
    window.paymentProcessor = processor; // Torna acessível globalmente se necessário
});

// CSS necessário
const styles = `
    .loading-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.9);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
    }

    .dancing-sheep-container {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 15px;
    }

    .dancing-sheep {
        width: 60px;
        height: 60px;
        animation: dance 1s infinite alternate;
    }

    .dancing-sheep:nth-child(2) {
        animation-delay: 0.2s;
    }

    .dancing-sheep:nth-child(3) {
        animation-delay: 0.4s;
    }

    .sad-sheep {
        width: 60px;
        height: 60px;
        animation: shake 0.5s infinite;
    }

    @keyframes dance {
        0% {
            transform: translateY(0) rotate(0deg);
        }
        50% {
            transform: translateY(-20px) rotate(10deg);
        }
        100% {
            transform: translateY(0) rotate(-10deg);
        }
    }

    @keyframes shake {
        0%, 100% {
            transform: translateX(0);
        }
        25% {
            transform: translateX(-5px);
        }
        75% {
            transform: translateX(5px);
        }
    }
`;

// Adiciona os estilos ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

window.addEventListener('load', async () => {
    console.log('Página carregada, iniciando PaymentProcessor...');
    const paymentProcessor = new PaymentProcessor();
    await paymentProcessor.init();
});
