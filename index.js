const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Configurar Gemini (COLOQUE SUA CHAVE ABAIXO)
const genAI = new GoogleGenerativeAI("AIzaSyBD9MpUQh1zPoJoVorlk5uTU2BB_hEhDQk");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 2. Configurar WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// 3. O NOVO TRUQUE DO QR CODE (Texto Puro)
client.on('qr', qr => {
    console.log('\n==================================================');
    console.log('COPIE TODO O TEXTO ABAIXO E COLE NO SITE GERADOR:');
    console.log('Site: https://www.the-qrcode-generator.com/ (Escolha a opção Text)');
    console.log('--------------------------------------------------');
    console.log(qr);
    console.log('--------------------------------------------------');
    console.log('==================================================\n');
});

client.on('ready', () => {
    console.log('🤖 Converge Motor Conectado e Pronto!');
});

// 4. A "Porta" que o seu site Hostinger vai chamar
app.post('/disparar', async (req, res) => {
    const { nome, telefone, produto, etapa } = req.body;

    try {
        let promptIA = "";
        
        // Regras de negócio do Converge
        if(etapa === "primeiro_contato") {
            promptIA = `Crie uma mensagem de WhatsApp curta e muito simpática para ${nome}, oferecendo o produto ${produto}. Não use emojis exagerados.`;
        } else if (etapa === "fechamento") {
            promptIA = `Crie uma mensagem persuasiva para ${nome} fechar a compra do ${produto} hoje. Gere um leve senso de urgência.`;
        } else {
            promptIA = `Crie uma mensagem de acompanhamento amigável para ${nome} sobre ${produto}.`;
        }

        // Gera o texto com IA
        const result = await model.generateContent(promptIA);
        const textoIA = result.response.text();

        // Dispara no WhatsApp
        const numeroFormatado = `55${telefone}@c.us`;
        await client.sendMessage(numeroFormatado, textoIA);

        // Responde para o site da Hostinger
        res.status(200).json({ sucesso: true, mensagem: textoIA });

    } catch (erro) {
        console.error("Erro no disparo:", erro);
        res.status(500).json({ sucesso: false, erro: "Falha ao processar" });
    }
});

client.initialize();

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
