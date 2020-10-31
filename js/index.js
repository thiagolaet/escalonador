const menuDiv = document.querySelector('.menu');
const simulatorDiv = document.querySelector('.simulator');
const outputDiv = document.getElementById('processesOutput');
const fileInput = document.getElementById('fileInput');
const timer = document.getElementById('timer');
const ready1Output = document.getElementById('ready1');

// Define quantos segundos cada loop do simulador irá durar (1000 = 1s)
var simulationTime = 1000;
var memoryPointer = 0;
var memoryBlocksInUse = new Array();
var j = 0;

var CPU = {
    process: undefined,
    quantumCounter: 0,
    output: document.querySelector('#outputCpu1')
} 

var simulatorTime = 0;
var processes = [];
var ready1 = [];
var ready2 = [];
var ready3 = [];
var finishedProcesses = [];

// Inicia o simulador
function start() {
    toggleClasses();
    var simulationLoop = setInterval(() => {
    // if (processes.length <= 0) console.log("Nenhum novo processo foi encontrado");
    
    checkProcesses();
    updateCPUs();
    updateReady();
    checkEndSimulation(simulationLoop);
    updateTimer();
    updateMemory();
    }, simulationTime);
}

// Checa se ainda existem processos em execução ou para serem executados, se não tiver termina a simulação
function checkEndSimulation(simulationLoop) {
    if (ready1.length == 0 && ready2.length == 0 && ready3.length == 0 && processes.length == 0 && !CPU.process) {
    console.log('A simulação terminou.')
    clearInterval(simulationLoop);
    }
}

// Compara os tempos de chegada do array de processos com o tempo atual do simulador e adiciona esses processos na primeira lista de prontos
function checkProcesses() {
    while (processes.length > 0 && processes[0].arrivalTime <= simulatorTime) {
    ready1.push(processes[0]);
    processes.shift();
    }
}

// Atualiza o timer
function updateTimer() {
    timer.textContent = `Tempo: ${simulatorTime}`;
    simulatorTime += 1;
}


// Escalonador de processos
function updateCPUs() {
    
    // Se tem processo ocupando a CPU
    if (CPU.process) {

    // Se o processo chegou ao final de sua execução
    if (CPU.process.remainingTime == 0) {
        console.log(`O processo ${CPU.process.name} terminou em ${simulatorTime - 1}\n`);
        CPU.process.endTime = simulatorTime - 1;
        finishedProcesses.push(CPU.process);
        resetCpu(CPU);
    }
    // Se o processo chegou no quantum
    else if (CPU.quantumCounter == 2) {
        console.log(`O processo ${CPU.process.name} liberou a CPU em ${simulatorTime - 1} em razão do quantum\n`);
        ready1.push(CPU.process);
        resetCpu(CPU);
    }
    else {
        CPU.process.remainingTime -= 1;

        // Impede que o processo de tempo real sofra interrupção por fatia de tempo
        if (CPU.process.priority == 1) CPU.quantumCounter += 1;
    }
    }

    // Se não tem processo na CPU e ainda tem processos na ready1
    if (CPU.process == undefined && ready1.length > 0) {
    CPU.process = ready1.shift();
    CPU.output.innerHTML = CPU.process.name;
    CPU.output.classList.add('activeProcess');
    CPU.quantumCounter = 1;
    CPU.process.remainingTime -= 1;
    console.log(`O processo ${CPU.process.name} CHEGOU em ${simulatorTime}`);
    }

}

// Restaura a CPU para as configurações iniciais
function resetCpu(cpu) {
    cpu.process = undefined;
    cpu.output.classList.remove('activeProcess');
    cpu.quantumCounter = 0;
    cpu.output.innerHTML = '';
}

// Atualiza as filas de pronto
// Por enquanto implementado apenas na fila 1
function updateReady() {
    ready1Output.innerHTML = '';
    ready1.forEach(e => {
    let li = document.createElement('li');
    li.classList.add('readyItem')
    li.textContent = e.name;
    ready1Output.appendChild(li);
    });
}

// Altera entre a visualização do menu e do simulador
function toggleClasses() {
    menuDiv.classList.toggle('hidden');
    simulatorDiv.classList.toggle('hidden');
}

// Pula para o final da simulação
function finish() {
}

// Termina a simulação atual e retorna ao menu
function menu() {
    finish();
    toggleClasses();
}

// Preenche a lista de objetos processos e atualiza o output relativo a eles no menu
function fillProcesses(text) {

    // Filtrando o input recebido pelo arquivo de texto
    processes = text.split('\n').filter((e) => e.length >= 6);

    // Inicializando a string que irá receber o texto para o output
    let outputText = '';
    
    // Transformando os processos da lista em objetos (facilita a leitura)
    for(i=0;i<processes.length;i++) {
    processes[i] = processes[i].replaceAll(' ', '');
    processes[i] = processes[i].split(',');
    processes[i] = {
        arrivalTime: parseInt(processes[i][0]),
        priority: parseInt(processes[i][1]),
        processorTime: parseInt(processes[i][2]),
        remainingTime: parseInt(processes[i][2]),
        mBytes: parseInt(processes[i][3]),
        printer: parseInt(processes[i][4]),
        disk: parseInt(processes[i][5]),
        inMemory: false
    }
    }

    // Ordenando os processos por arrivalTime
    processes.sort((a, b) => {
    return a.arrivalTime - b.arrivalTime;
    });

    // Nomeando os processos agora ordenados por arrival time e atualizando o output de processos
    for (i=0; i<processes.length;i++) {
    processes[i].name = `P${i}`;
    outputText += `${processes[i].name}: ${processes[i].arrivalTime}, ${processes[i].priority}, ${processes[i].processorTime}, ${processes[i].mBytes}, ${processes[i].printer}, ${processes[i].disk}<br>`;
    }
    outputDiv.innerHTML=outputText;

}


// Preenche a var memoryBlocksUsed com um par de valores (talvez fosse melgor um array 2d tipo par ordenado)
function updateMemory(){
    for(i = 0; i < processes.length; i++) {

        if(processes[i].inMemory == false && simulatorTime >= processes[i].arrivalTime) {
            //"alocando" memoria assim que o arrival time chega
            
            memoryBlocksInUse.push([memoryPointer, memoryPointer + processes[i].mBytes]);
            j = j+1;
            memoryPointer += processes[i].mBytes;
            console.log(`Apontador esta em ${memoryPointer}, lista de processos: ${memoryBlocksInUse}, tempo da simulacao: ${simulatorTime} `);
            processes[i].inMemory = true;
        }
    }
}

// Altera a lista de processos quando é recebido um novo input de arquivo
fileInput.addEventListener('change', function() { 
    var fr=new FileReader(); 
    fr.onload=function(){ 
    fillProcesses(fr.result);
    } 
    outputDiv.classList.remove('hidden');
    
    fr.readAsText(this.files[0]); 
});