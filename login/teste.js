// Função para obter clientes da primeira API
async function obterClientes() {
    try {
      const response = await fetch("https://script.googleusercontent.com/macros/echo?user_content_key=iGY7eQgZrKNnoL29HCMrmHExKff2rX5ZYoNVEPfl-NmZnCNr1ED_1eqXCoxpWlPtImiaBsGFh5yMM-TMv8w8SGJu75MlCyUkm5_BxDlH2jW0nuo2oDemN9CCS2h10ox_1xSncGQajx_ryfhECjZEnFmuRg7QBeLO_rz9zVx0FRmWRXLWaf0QA6HXqubbvOdtEvmgH01E3-fClFAXUcBJ1_kmpLwYuqilTkutGfbxiMuofs-pIiI-wP4o3vTAnvhhfwZ_58Bdfow&lib=Mmi9RqdTsgQWr4a9edKxUfy7EI1pfPepA");
      const data = await response.json();
      return data.clientes; // Lista de clientes
    } catch (error) {
      console.error("Erro ao obter clientes:", error);
      return [];
    }
  }
  
  // Função para cadastrar um cliente na segunda API
  async function cadastrarCliente(cliente) {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Basic SWFnby50ZXN0ZToyNWQ1NWFkMjgzYWE0MDBhZjQ2NGM3NmQ3MTNjMDdhZA==");
    myHeaders.append("Content-Type", "application/json");
  
    const raw = JSON.stringify({
      nomeCliente: cliente.Nome,
      telefoneCliente: cliente.Telefone.toString(),
      endereco: `${cliente.Endereco}, ${cliente.Num} - ${cliente.Bairro}, CEP: ${cliente.Cep}`
    });
  
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };
  
    try {
      const response = await fetch("http://127.0.0.1:3000/api/client/cadastrar", requestOptions);
      const result = await response.text();
      console.log(`Cliente ${cliente.Nome} cadastrado com sucesso:`, result);
    } catch (error) {
      console.error(`Erro ao cadastrar cliente ${cliente.Nome}:`, error);
    }
  }
  
  // Função principal para orquestrar o processo
  async function processarClientes() {
    const clientes = await obterClientes();
    if (clientes.length === 0) {
      console.log("Nenhum cliente encontrado para cadastro.");
      return;
    }
  
    for (const cliente of clientes) {
      await cadastrarCliente(cliente); // Cadastra cliente um por vez
    }
  
    console.log("Processamento concluído.");
  }
  
  // Executar a função principal
  processarClientes();
  