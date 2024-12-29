const app = require('./app'); // Importa o arquivo app.js
const fs = require('fs'); // Importa o módulo fs para manipulação de arquivos
const path = require('path'); // Importa o módulo path para trabalhar com caminhos de arquivos

// Define a porta de execução do servidor
const PORT = process.env.PORT || 3000;

// Caminho para a pasta public/pdfs
const pdfsFolderPath = path.join(__dirname, 'public/pdfs');

// Função para limpar a pasta public/pdfs
const clearPdfsFolder = () => {
    fs.readdir(pdfsFolderPath, (err, files) => {
        if (err) {
            console.error(`Erro ao ler a pasta ${pdfsFolderPath}:`, err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(pdfsFolderPath, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Erro ao deletar o arquivo ${filePath}:`, err);
                } else {
                    console.log(`Arquivo deletado: ${filePath}`);
                }
            });
        });
    });
};

// Configura o intervalo para limpar a pasta a cada 2 minutos
setInterval(clearPdfsFolder, 2 * 60 * 1000);

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
    const url = `http://127.0.0.1:${PORT}`; // Caminho completo do servidor
    console.log(`Servidor rodando no IP: ${url}`);
});
