const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const qrcodeLib = require('qrcode'); // Nova biblioteca que desenha o QR

const app = express();
app.use(express.json());
app.use(cors());

// Sua Chave do Gemini (Lembre de colocar a sua aqui!)
const genAI = new GoogleGenerativeAI("AIzaSyBD9MpUQh1zPoJoVorlk5uTU2BB_hEhDQk");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let ultimoQR = ""; // Memória para guardar o QR Code mais fresco

// Configurar WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

client.on('qr', qr => {
    ultimoQR = qr; // Salva o código novo
    console.log('🔄 Novo QR Code gerado! Acesse a página /qr para escanear.');
});

client.on('ready', () => {
    console.log('🤖 Converge Motor Conectado e Pronto!');
    ultimoQR = "CONECTADO"; // Limpa o QR da tela quando conecta
});

// A PÁGINA SECRETA DO QR CODE
app.get('/qr', async (req, res) => {
    if (ultimoQR === "CONECTADO") {
        return res.send('<h1 style="color:green; text-align:center; margin-top:50px;">✅ Robô Conectado com Sucesso!</h1>');
    }
    if (!ultimoQR) {
        return res.send('<h1 style="text-align:center; margin-top:50px;">⏳ Aguarde o robô ligar. Atualize a página em 10 segundos...</h1>');
    }
    
    try {
        const qrImage = await qrcodeLib.toDataURL(ultimoQR);
        res.send(`
            <body style="display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f0f2f5; font-family:sans-serif;">
                <div style="text-align:center; background:#fff; padding:40px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                    <h2 style="color:#333; margin-bottom:20px;">Escaneie para conectar o Converge</h2>
                    <img src="${qrImage}" style="width:300px; height:300px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;" />
                    <p style="color:#666; margin-top:20px;">O código expira rápido. Atualize a página (F5) para gerar um novo se falhar.</p>
                </div>
            </body>
        `);
    } catch (err) {
        res.send('Erro ao gerar imagem.');
    }
});

// A Rota de Disparo que a Hostinger chama
app.post('/disparar', async (req, res) => {
    const { nome, telefone, produto, etapa } = req.body;
    try {
        let promptIA = "";
        if(etapa === "primeiro_contato") promptIA = `Crie uma mensagem curta e simpática de WhatsApp para ${nome}, oferecendo o produto ${produto}.`;
        else if (etapa === "fechamento") promptIA = `Crie uma mensagem persuasiva para ${nome} fechar a compra do ${produto} hoje.`;
        else promptIA = `Crie uma mensagem de acompanhamento amigável para ${nome} sobre ${produto}.`;

        const result = await model.generateContent(promptIA);
        const textoIA = result.response.text();

        await client.sendMessage(`55${telefone}@c.us`, textoIA);
        res.status(200).json({ sucesso: true, mensagem: textoIA });
    } catch (erro) {
        res.status(500).json({ sucesso: false, erro: "Falha ao processar" });
    }
});

client.initialize();
app.listen(process.env.PORT || 3000, () => console.log('Servidor Ligado!'));
