
const camera = document.querySelector("#camera");
const foto = document.querySelector("#foto");

const iniciar = document.querySelector("#iniciar");
const capturar = document.querySelector("#capturar");

// Iniciar câmera frontal
iniciar.addEventListener("click", async () => {

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    });

    camera.srcObject = stream;
});

// Capturar foto
capturar.addEventListener("click", () => {

    const contexto = foto.getContext("2d");

    foto.width = camera.videoWidth;
    foto.height = camera.videoHeight;

    contexto.drawImage(camera, 0, 0);

});
