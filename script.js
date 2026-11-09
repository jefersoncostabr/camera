const status = document.querySelector("#status");
const resultado = document.querySelector("#resultado");
const comparar = document.querySelector("#comparar");
const camera = document.querySelector("#camera");
const foto = document.querySelector("#foto");
const iniciar = document.querySelector("#iniciar");
const capturar = document.querySelector("#capturar");
const destino = document.querySelector("#destino");

const fotos = {
    1: {
        input: document.querySelector("#foto1"),
        preview: document.querySelector("#preview1"),
        objectUrl: null
    },
    2: {
        input: document.querySelector("#foto2"),
        preview: document.querySelector("#preview2"),
        objectUrl: null
    }
};

let modelosCarregados = false;
let comparacaoEmAndamento = false;

function atualizarBotaoComparar() {
    comparar.disabled = !modelosCarregados
        || comparacaoEmAndamento
        || !fotos[1].preview.naturalWidth
        || !fotos[2].preview.naturalWidth;
}

function definirFoto(numero, origem, objectUrl = null) {
    const item = fotos[numero];

    if (item.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
    }

    item.objectUrl = objectUrl;
    item.preview.src = origem;
    item.preview.hidden = false;
    resultado.textContent = "";
    atualizarBotaoComparar();
}

Object.entries(fotos).forEach(([numero, item]) => {
    item.input.addEventListener("change", () => {
        const arquivo = item.input.files[0];
        if (!arquivo) return;

        if (!arquivo.type.startsWith("image/")) {
            status.textContent = "Selecione um arquivo de imagem válido.";
            item.input.value = "";
            return;
        }

        const objectUrl = URL.createObjectURL(arquivo);
        item.preview.onload = () => {
            status.textContent = "Foto carregada. Selecione a outra para comparar.";
            atualizarBotaoComparar();
        };
        item.preview.onerror = () => {
            status.textContent = "Não foi possível abrir essa imagem. Escolha outro arquivo.";
            atualizarBotaoComparar();
        };
        definirFoto(numero, objectUrl, objectUrl);
    });

    item.preview.addEventListener("load", atualizarBotaoComparar);
});

async function carregarModelos() {
    if (!window.faceapi) {
        status.textContent = "Não foi possível carregar face-api.js. Verifique sua conexão e recarregue a página.";
        return;
    }

    const urlModelos = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

    try {
        await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(urlModelos),
            window.faceapi.nets.faceLandmark68Net.loadFromUri(urlModelos),
            window.faceapi.nets.faceRecognitionNet.loadFromUri(urlModelos)
        ]);
        modelosCarregados = true;
        status.textContent = "Modelos carregados. Selecione as duas fotos.";
        atualizarBotaoComparar();
    } catch (erro) {
        console.error("Erro ao carregar os modelos do face-api.js:", erro);
        status.textContent = "Não foi possível carregar os modelos faciais. Verifique sua conexão e recarregue a página.";
    }
}

comparar.addEventListener("click", async () => {
    if (!modelosCarregados || comparar.disabled) return;

    comparacaoEmAndamento = true;
    atualizarBotaoComparar();
    status.textContent = "Analisando as fotos...";
    resultado.textContent = "";

    try {
        const detectarRostos = imagem => window.faceapi
            .detectAllFaces(
                imagem,
                new window.faceapi.TinyFaceDetectorOptions({
                    inputSize: 416,
                    scoreThreshold: 0.5
                })
            )
            .withFaceLandmarks()
            .withFaceDescriptors();

        const [rostos1, rostos2] = await Promise.all([
            detectarRostos(fotos[1].preview),
            detectarRostos(fotos[2].preview)
        ]);

        if (rostos1.length !== 1 || rostos2.length !== 1) {
            resultado.textContent = "Cada foto precisa mostrar exatamente um rosto. "
                + `Encontrados: ${rostos1.length} na primeira e ${rostos2.length} na segunda.`;
            status.textContent = "Não foi possível comparar as fotos.";
            return;
        }

        const distancia = window.faceapi.euclideanDistance(
            rostos1[0].descriptor,
            rostos2[0].descriptor
        );
        const mesmaPessoa = distancia < 0.6;

        resultado.textContent = mesmaPessoa
            ? `Os rostos parecem ser da mesma pessoa (distância: ${distancia.toFixed(2)}).`
            : `Os rostos parecem ser de pessoas diferentes (distância: ${distancia.toFixed(2)}).`;
        status.textContent = "Comparação concluída.";
    } catch (erro) {
        console.error("Erro ao comparar os rostos:", erro);
        status.textContent = "Ocorreu um erro durante a comparação.";
        resultado.textContent = "Verifique se as fotos são válidas e tente novamente.";
    } finally {
        comparacaoEmAndamento = false;
        atualizarBotaoComparar();
    }
});

iniciar.addEventListener("click", async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "Este navegador não permite acessar a câmera. Abra a página em HTTPS.";
        return;
    }

    try {
        camera.srcObject = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });
        await camera.play();
        capturar.disabled = false;
        status.textContent = "Câmera iniciada. Escolha em qual foto salvar a captura.";
    } catch (erro) {
        console.error("Erro ao iniciar a câmera:", erro);
        status.textContent = "Não foi possível iniciar a câmera. Verifique a permissão do navegador.";
    }
});

capturar.addEventListener("click", () => {
    if (!camera.videoWidth || !camera.videoHeight) {
        status.textContent = "Aguarde a câmera iniciar antes de capturar.";
        return;
    }

    foto.width = camera.videoWidth;
    foto.height = camera.videoHeight;
    foto.getContext("2d").drawImage(camera, 0, 0);
    definirFoto(destino.value, foto.toDataURL("image/png"));
    status.textContent = `Captura salva como ${destino.value === "1" ? "primeira" : "segunda"} foto.`;
});

carregarModelos();
