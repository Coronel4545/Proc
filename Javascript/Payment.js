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
        this.loadingDiv = document.getElementById('loading-div');
        this.sheepSound = document.getElementById('sheep-sound');
        this.web3 = null;
        this.userAddress = null;
        this.centerBottomBtn = document.getElementById('center-bottom-btn');
        this.centerBottomBtn.addEventListener('click', () => this.realizarPagamento());
    }

    async init() {
        try {
            // Verifica se está na BSC Testnet
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                const chainId = await this.web3.eth.getChainId();
                
                if (chainId !== 97) { // 97 é o chainId da BSC Testnet
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x61' }], // 0x61 = 97 em hex
                    });
                }
                
                this.userAddress = (await this.web3.eth.requestAccounts())[0];
                this.centerBottomBtn.disabled = false;
            } else {
                throw new Error('Por favor, instale a MetaMask!');
            }
        } catch (error) {
            this.showError('Erro ao conectar à BSC Testnet: ' + error.message);
            this.centerBottomBtn.disabled = true;
        }
    }

    async realizarPagamento() {
        try {
            this.centerBottomBtn.disabled = true;
            this.showLoading();
            
            const tokenContract = new this.web3.eth.Contract(
                TOKEN_ABI,
                RAM_TOKEN_ADDRESS
            );

            const contractInstance = new this.web3.eth.Contract(TOKEN_ABI, CONTRACT_ADDRESS);

            // 1. Verifica saldo de BNB primeiro
            const bnbBalance = await this.web3.eth.getBalance(this.userAddress);
            const gasPrice = await this.web3.eth.getGasPrice();
            const gasEstimateApprove = await tokenContract.methods.approve(CONTRACT_ADDRESS, REQUIRED_AMOUNT)
                .estimateGas({ from: this.userAddress });
            const gasEstimatePayment = await contractInstance.methods.processPayment()
                .estimateGas({ from: this.userAddress });
            
            const totalGasCost = BigInt(gasPrice) * BigInt(gasEstimateApprove + gasEstimatePayment);
            
            if (BigInt(bnbBalance) < totalGasCost) {
                throw new Error('Saldo BNB insuficiente para pagar o gás da transação');
            }

            // 2. Verifica saldo RAM
            const saldo = await tokenContract.methods.balanceOf(this.userAddress).call();
            if (BigInt(saldo) < BigInt(REQUIRED_AMOUNT)) {
                throw new Error('Saldo RAM insuficiente');
            }

            // 3. Aprova o gasto
            const approvalTx = await tokenContract.methods.approve(CONTRACT_ADDRESS, REQUIRED_AMOUNT).send({
                from: this.userAddress,
                gasPrice: gasPrice
            });

            if (!approvalTx.status) {
                throw new Error('Falha na aprovação dos tokens');
            }

            // 4. Envia o pagamento
            const paymentTx = await contractInstance.methods.processPayment().send({
                from: this.userAddress,
                gasPrice: gasPrice
            });

            if (paymentTx.status) {
                this.sheepSound.play();
                this.showSuccess();
                
                // Solicita URL à API
                const response = await fetch('sua-api-url/get-website', {
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
            this.showError('Erro no pagamento: ' + error.message);
        } finally {
            this.hideLoading();
            this.centerBottomBtn.disabled = false;
        }
    }

    showLoading() {
        this.loadingDiv.innerHTML = `
            <div class="loading-container">
                <img src="ram-token.png" class="moving-ram" />
                <p>Processando pagamento...</p>
            </div>
        `;
        this.loadingDiv.style.display = 'block';
    }

    showSuccess() {
        this.loadingDiv.innerHTML = `
            <div class="success-container">
                <img src="ram-token.png" />
                <p>Pagamento realizado com sucesso!</p>
            </div>
        `;
    }

    showError(message) {
        this.loadingDiv.innerHTML = `
            <div class="error-container">
                <img src="ram-token.png" />
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
            
            // Atualiza um elemento na interface para mostrar o custo estimado
            document.getElementById('gas-estimate').textContent = 
                `Custo estimado: ${totalCostBNB} BNB`;
        } catch (error) {
            console.error('Erro ao calcular estimativa:', error);
        }
    }

    async estimateTotalGas() {
        const tokenContract = new this.web3.eth.Contract(TOKEN_ABI, RAM_TOKEN_ADDRESS);
        const contractInstance = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        
        const approveGas = await tokenContract.methods.approve(CONTRACT_ADDRESS, REQUIRED_AMOUNT)
            .estimateGas({ from: this.userAddress });
        const paymentGas = await contractInstance.methods.processPayment()
            .estimateGas({ from: this.userAddress });
            
        return approveGas + paymentGas;
    }
}

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

    .moving-ram {
        animation: moveRam 2s infinite linear;
    }

    @keyframes moveRam {
        from { transform: translateX(-100%); }
        to { transform: translateX(100%); }
    }
`;