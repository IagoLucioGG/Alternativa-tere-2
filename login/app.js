import { API_URL } from '../config/api-url.js';

const { createApp } = Vue;

createApp({
  data() {
    return {
      loginUsuario: '',
      senha: '',
      modal: {
        visible: false,
        message: '',
        type: 'success', // success or error
      },
    };
  },
  methods: {
    async handleLogin() {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        loginUsuario: this.loginUsuario,
        senha: this.senha,
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      try {
        console.log(`${API_URL}/users/login`); // Verifique se a URL está correta
        const response = await fetch(`${API_URL}/users/login`, requestOptions);
        const result = await response.json();
      
        if (response.ok) {
          localStorage.setItem("token", result.token);
          this.showModal("Login realizado com sucesso!", "success");
      
          // Aguarda 2 segundos antes do redirecionamento (opcional)
          setTimeout(() => {
            window.location.href = "../grade/index.html"; // Substitua pelo nome da página de destino
          }, 2000);
          
        } else {
          this.showModal(result.message || "Erro no login.", "error");
        }
      } catch (error) {
        this.showModal("Erro ao conectar ao servidor.", "error");
      }
    },
    showModal(message, type) {
      this.modal.message = message;
      this.modal.type = type;
      this.modal.visible = true;

      setTimeout(() => {
        this.modal.visible = false;
      }, 3000); // Fecha o modal após 3 segundos
    },
  },
}).mount('#app');
