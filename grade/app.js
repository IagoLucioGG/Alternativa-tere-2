new Vue({
    el: '#app',
    data: {
        nomeCliente: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        bairro: '',
        produtos: [],
        novoProduto: {
            nome: '',
            quantidade: 0,
            valor: 0
        },
        clientes: [],
        produtosDisponiveis: [],
        clientesFiltrados: [],
        produtosFiltrados: [],
        totalProdutos: 0,
        valorTotal: 0,
        editarIndex: null,
        assinarErro: false,
        idCliente: null, // Armazena o ID do cliente
    },
    mounted() {
        this.carregarDados();
    },
    methods: {
        async carregarDados() {
            const clientesApi = "http://127.0.0.1:3000/api/clientes";
            const produtosApi = "http://127.0.0.1:3000/api/products";

            try {
                // Recupera o token do localStorage
                const token = localStorage.getItem("token");
                console.log(token)
                if (!token) {
                    console.error("Token de autenticação não encontrado no localStorage.");
                    window.location.href = "../login/index.html";
                    return; // Para execução do restante do código
                }

                // Configuração dos headers
                const myHeaders = new Headers();
                myHeaders.append("Authorization", `${token}`);

                const requestOptions = {
                    method: "GET",
                    headers: myHeaders,
                    redirect: "follow",
                };

                // Faz as chamadas às APIs
                const [clientesResponse, produtosResponse] = await Promise.all([
                    fetch(clientesApi, requestOptions),
                    fetch(produtosApi, requestOptions),
                ]);

                // Verifica se houve erro de autorização (401)
                if (clientesResponse.status === 401 || produtosResponse.status === 401) {
                    console.error("Não autorizado. Redirecionando para a página de login.");
                    window.location.href = "../login/index.html";
                    return; // Para execução do restante do código
                }

                // Converte as respostas para JSON
                const clientesData = await clientesResponse.json();
                const produtosData = await produtosResponse.json();

                // Verifica e processa os dados
                console.log("Clientes:", clientesData.clientes);
                console.log("Produtos:", produtosData.produtos);

                this.clientes = Array.isArray(clientesData.clientes) ? clientesData.clientes : [];
                this.produtosDisponiveis = Array.isArray(produtosData.produtos)
                    ? produtosData.produtos.map((prod) => ({
                        ...prod
                    }))
                    : [];
                
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                //Redireciona para a página de login em caso de erro crítico
                window.location.href = "../login/index.html";
            }
        },


        filtrarClientes() {
            this.clientesFiltrados = this.clientes.filter(cliente =>
                cliente.nomeCliente.toLowerCase().includes(this.nomeCliente.toLowerCase())
            );
        },
        selecionarCliente(cliente) {
            this.idCliente = cliente.idCliente;
            this.nomeCliente = cliente.nomeCliente;
            this.telefone = cliente.telefoneCliente;
            this.endereco = cliente.endereco;

            this.clientesFiltrados = [];
        },
        async cadastrarCliente() {
            const apiUrl = "http://127.0.0.1:3000/api/client/cadastrar";

            try {
                // Recupera o token do localStorage
                const token = localStorage.getItem("token");

                if (!token) {
                    console.error("Token de autenticação não encontrado no localStorage.");
                    window.location.href = "../login/index.html";
                    return; // Para execução do restante do código
                }

                // Configuração dos headers
                const myHeaders = new Headers();
                myHeaders.append("Authorization", `${token}`);
                myHeaders.append("Content-Type", "application/json");

                // Corpo da requisição
                const raw = JSON.stringify({
                    nomeCliente: this.nomeCliente,
                    telefoneCliente: this.telefone,
                    endereco: this.endereco,
                });

                const requestOptions = {
                    method: "POST",
                    headers: myHeaders,
                    body: raw,
                    redirect: "follow",
                };

                // Faz a requisição
                const response = await fetch(apiUrl, requestOptions);

                // Trata a resposta
                if (!response.ok) {
                    if (response.status === 401) {
                        console.error("Não autorizado. Redirecionando para a página de login.");
                        window.location.href = "../login/index.html";
                        return;
                    } else {
                        throw new Error(`Erro na requisição: ${response.statusText}`);
                    }
                }

                const result = await response.json();

                // Verifica o resultado da API
                if (result.clienteCadastrado && result.clienteCadastrado.clientId) {
                    this.idCliente = result.clienteCadastrado.clientId;
                    console.log(result.message); // Exibe a mensagem de sucesso
                } else {
                    console.error("Erro ao cadastrar cliente:", result.message || "Erro desconhecido.");
                }
            } catch (error) {
                console.error("Erro ao cadastrar cliente:", error);
            }
        },


        filtrarProdutos() {
            this.produtosFiltrados = this.produtosDisponiveis.filter(produto => {
                // Verifica se produto.Nome é uma string antes de chamar toLowerCase
                
                return typeof produto.NomeProduto === 'string' && produto.NomeProduto.toLowerCase().includes(this.novoProduto.nome.toLowerCase());
            });
        },
        selecionarProduto(produto) {
            this.novoProduto = { idProduto: produto.idProduto, nome: produto.NomeProduto, quantidade: 0, valor: produto.VlProduto };
            this.produtosFiltrados = [];
        },
        excluirProduto(index) {
            if (confirm("Tem certeza que deseja excluir este produto?")) {
                this.produtos.splice(index, 1); // Remove o produto da lista
                this.atualizarTotal(); // Atualiza o total após a exclusão
                
            }
        },
        adicionarOuAtualizarProduto() {
            // Verifica se todos os campos necessários estão preenchidos
            if (this.novoProduto.nome && this.novoProduto.quantidade > 0 && this.novoProduto.valor > 0) {
                // Verifica se o produto existe na lista de produtosDisponiveis
                const produtoDisponivel = this.produtosDisponiveis.find(prod =>
                    prod.NomeProduto.toLowerCase() === this.novoProduto.nome.toLowerCase()
                );

                // Verifica se o produto já está na lista de produtos
                const produtoNaLista = this.produtos.find(prod =>
                    prod.nome.toLowerCase() === this.novoProduto.nome.toLowerCase()
                );

                if (produtoDisponivel) {

                    if (produtoNaLista) {
                    
                        // Atualiza as informações do produto se ele já estiver na lista
                        produtoNaLista.quantidade = this.novoProduto.quantidade;
                        produtoNaLista.valor = parseFloat(this.novoProduto.valor);
                        

                    } else {
                        // Adiciona o produto à lista de produtos
                        this.produtos.push({
                            IdProduto: produtoDisponivel.IdProduto,
                            nome: produtoDisponivel.NomeProduto,
                            quantidade: this.novoProduto.quantidade,
                            valor: parseFloat(this.novoProduto.valor)
                        });
                        

                    }
                } else {
                    // Cria um novo produto com os dados fornecidos
                    const novoProduto = {
                        nome: this.novoProduto.nome,
                        quantidade: this.novoProduto.quantidade,
                        valor: parseFloat(this.novoProduto.valor)
                    };
                    this.cadastrarProduto(novoProduto.nome, novoProduto.valor);
                    // Adiciona o novo produto na lista de produtosDisponiveis e em produtos
                    this.produtosDisponiveis.push(novoProduto);
                    this.produtos.push(novoProduto);
                    

                    // Cadastra o produto na API

                }

                this.carregarDados();

                // Limpa o formulário do novo produto
                this.novoProduto = { nome: '', quantidade: 0, valor: 0 };
                this.atualizarTotal();
            } else {
                console.error("Nome, quantidade e valor do produto são obrigatórios.");
            }
        },




        async cadastrarProduto(nome, valor) {
            const apiUrl = "http://127.0.0.1:3000/api/product/cadastrar";

            try {
                // Recupera o token do localStorage
                const token = localStorage.getItem("token");

                if (!token) {
                    console.error("Token de autenticação não encontrado no localStorage.");
                    window.location.href = "../login/index.html";
                    return; // Para execução do restante do código
                }

                // Configuração dos headers
                const myHeaders = new Headers();
                myHeaders.append("Authorization", `${token}`);
                myHeaders.append("Content-Type", "application/json");

                // Corpo da requisição
                const raw = JSON.stringify({
                    nomeProduto: nome,
                    vlProduto: valor,
                });

                const requestOptions = {
                    method: "POST",
                    headers: myHeaders,
                    body: raw,
                    redirect: "follow",
                };

                // Faz a requisição
                const response = await fetch(apiUrl, requestOptions);

                // Trata a resposta
                if (!response.ok) {
                    if (response.status === 401) {
                        console.error("Não autorizado. Redirecionando para a página de login.");
                        window.location.href = "../login/index.html";
                        return;
                    } else {
                        throw new Error(`Erro na requisição: ${response.statusText}`);
                    }
                }

                const result = await response.json();

                // Verifica o resultado da API
                if (result.IdProduto) {
                    return { mensagem: "Produto cadastrado com sucesso", IdProduto: result.IdProduto };
                } else {
                    return { erro: result.message || "Erro ao cadastrar produto." };
                }
            } catch (error) {
                console.error("Erro ao cadastrar produto:", error);
                return { erro: "Erro ao cadastrar produto." };
            }
        },

        editarProduto(index) {
            this.editarIndex = index;
            this.novoProduto = { ...this.produtos[index] };
        },
        atualizarTotal() {
            this.totalProdutos = this.produtos.length;
            this.valorTotal = this.produtos.reduce((total, produto) => total + (produto.valor * produto.quantidade), 0);
        },
        async carregarHtmlPDF() {
            const response = await fetch('pdfContent.html');
            return await response.text();
        },
        async gerarPDF(idGradeImpressao) {
            const token = localStorage.getItem("token");
        
            if (!token) {
                console.error("Token de autenticação não encontrado no localStorage.");
                window.location.href = "../login/index.html";
                return;
            }
        
            
            const requestOptions = {
                method: "GET",
                headers: new Headers({
                    "Authorization": `${token}`
                }),
                redirect: "follow"
            };
        
            try {
                const response = await fetch(`http://127.0.0.1:3000/api/grade/imprimir/${idGradeImpressao}`, requestOptions);
        
                if (!response.ok) {
                    if (response.status === 401) {
                        console.error("Token inválido ou expirado. Redirecionando para a página de login.");
                        window.location.href = "../login/index.html";
                        return;
                    } else {
                        throw new Error(`Erro na requisição: ${response.statusText}`);
                    }
                }
        
                // Supondo que a resposta seja um PDF binário
                const blob = await response.blob();
        
                // Cria uma URL temporária para o PDF
                const url = URL.createObjectURL(blob);
        
                // Abre o PDF em uma nova aba
                window.open(url, '_blank');
            } catch (error) {
                console.error("Erro ao gerar PDF:", error);
            }
        },
        


        async cadastrarGrade() {
            // Recupera o token do localStorage
            const token = localStorage.getItem("token");

            if (!token) {
                console.error("Token de autenticação não encontrado no localStorage.");

                // Salva as informações da grade no localStorage antes de redirecionar
                localStorage.setItem("gradeInfo", JSON.stringify({
                    produtos: this.produtos,
                    idCliente: this.idCliente,
                    dataPrevistaEncerramento: "2024-12-31",  // Coloque a data que você deseja usar
                }));

                // Redireciona para a página de login
                window.location.href = "../login/index.html";
                return; // Interrompe a execução da função
            }

            // Verifica se o cliente já está cadastrado
            if (!this.idCliente) {
                // Tenta cadastrar o cliente
                await this.cadastrarCliente();

                // Se o cadastro for bem-sucedido, atualiza o idCliente
                if (this.idCliente) {
                    console.log(`Cliente cadastrado com ID: ${this.idCliente}`);
                } else {
                    console.error('Erro ao cadastrar cliente. Não é possível cadastrar a grade.');
                    return false; // Interrompe a função se não houver ID do cliente
                }
            }

            // Verifica se existem produtos
            if (!this.produtos.length) {
                console.error('Produtos são obrigatórios.');
                return false;
            }

            const apiUrl = "http://127.0.0.1:3000/api/grade/cadastrar";

            // Cria o corpo da requisição
            
            const raw = JSON.stringify({
                idCliente: this.idCliente,
                dataPrevistaEncerramento: (function() {
                    const hoje = new Date();
                    hoje.setDate(hoje.getDate() + 15); // Adiciona 15 dias
                    return hoje.toISOString().split('T')[0]; // Formata a data no formato YYYY-MM-DD
                })(),
                itens: this.produtos.map(produto => ({
                    idProduto: produto.IdProduto,  // Certifique-se que "produto.nome" seja o ID correto
                    VlProduto: Number(produto.valor),
                    qtProduto: Number(produto.quantidade)
                }))
            });
            

            // Configura os headers para a requisição
            const myHeaders = new Headers();
            myHeaders.append("Authorization", `${token}`);
            myHeaders.append("Content-Type", "application/json");

            const requestOptions = {
                method: "POST",
                headers: myHeaders,
                body: raw,
                redirect: "follow"
            };

            try {
                // Faz a requisição
                const response = await fetch(apiUrl, requestOptions);

                // Se a resposta for 401 (não autorizado), redireciona para login e salva a grade no localStorage
                if (response.status === 401) {
                    console.error("Não autorizado. Redirecionando para a página de login.");

                    // Salva as informações da grade no localStorage antes de redirecionar
                    localStorage.setItem("gradeInfo", JSON.stringify({
                        produtos: this.produtos,
                        idCliente: this.idCliente,
                        dataPrevistaEncerramento: (function() {
                            const hoje = new Date();
                            hoje.setDate(hoje.getDate() + 15); // Adiciona 15 dias
                            return hoje.toISOString().split('T')[0]; // Formata a data no formato YYYY-MM-DD
                        })(), // Coloque a data que você deseja usar
                    }));

                    window.location.href = "../login/index.html";
                    return; // Interrompe a execução da função
                }

                const result = await response.json();

                // Verifica se a requisição foi bem-sucedida
                if (result.message) {
                    console.log('Grade cadastrada com sucesso:', result);
                    await this.gerarPDF(result.gradeCadastrada.idGrade);  // Chama a função de gerar PDF após o sucesso
                    this.resetarFormulario();  // Reseta o formulário após o cadastro
                    return true;  // Retorna true para indicar sucesso
                } else {
                    console.error('Erro ao cadastrar grade:', result.message);
                    return false;  // Retorna false para indicar falha
                }
            } catch (error) {
                console.error('Erro ao cadastrar grade:', error);
                return false;  // Retorna false para indicar falha
            }
        },


        // Função que já está na sua implementação
        resetarFormulario() {
            this.nomeCliente = '';
            this.telefone = '';
            this.cep = '';
            this.endereco = '';
            this.numero = '';
            this.bairro = '';
            this.produtos = [];
            this.novoProduto = { nome: '', quantidade: 0, valor: 0 };
            this.totalProdutos = 0;
            this.valorTotal = 0;
            this.clientesFiltrados = [];
            this.produtosFiltrados = [];
            this.idCliente = null;
        },
        irParaOutraPagina() {
            window.location.href = "../fechamentoGrade/index.html";
        }
    },
    watch: {
        produtos: function () {
            this.atualizarTotal();
        }
    }
});