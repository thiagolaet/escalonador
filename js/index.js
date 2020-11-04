const menuDiv = document.querySelector('.menu');
const simulatorDiv = document.querySelector('.simulator');
const outputDiv = document.getElementById('processesOutput');
const fileInput = document.getElementById('fileInput');
const timer = document.getElementById('timer');
const ready1Output = document.getElementById('ready1');
const ready2Output = document.getElementById('ready2');
const ready3Output = document.getElementById('ready3');
const priorityQueueOutput = document.getElementById('priorityQueue');


var CPUs = [
  {
    process: undefined,
    quantumCounter: 0,
    lastQueue: undefined,
    output: document.querySelector('#outputCpu1'),
  },
  {
    process: undefined,
    quantumCounter: 0,
    lastQueue: undefined,
    output: document.querySelector('#outputCpu2'),
  },
  {
    process: undefined,
    quantumCounter: 0,
    lastQueue: undefined,
    output: document.querySelector('#outputCpu3'),
  },
  {
    process: undefined,
    quantumCounter: 0,
    lastQueue: undefined,
    output: document.querySelector('#outputCpu4'),
  }
]

var simulatorTime = 0;
var processes = [];
var finishedProcesses = [];

// Fila dos processos sem prioridade (Feedback)
var ready1 = [];
var ready2 = [];
var ready3 = [];

// Fila dos processos de tempo real (FCFS)
var priorityQueue = [];

// Inicia o simulador
function start() {

  // Define quantos segundos cada loop do simulador irá durar (1000 = 1s)
  const simulationTime = parseFloat(document.getElementById("timeInput").value) * 1000;

  toggleClasses();
  var simulationLoop = setInterval(() => {    
    checkProcesses();
    updateCPUs();
    updateQueues();
    checkEndSimulation(simulationLoop);
    updateTimer();
  }, simulationTime);
}

// Checa se ainda existem processos em execução ou para serem executados, se não tiver termina a simulação
function checkEndSimulation(simulationLoop) {
  if (ready1.length == 0 && ready2.length == 0 && ready3.length == 0 && processes.length == 0 && !CPUs[0].process && !CPUs[1].process && !CPUs[2].process && !CPUs[3].process) {
    Interface.log(`A simulação terminou em t = ${simulatorTime}.`);
    clearInterval(simulationLoop);
  }
}

// Compara os tempos de chegada do array de processos com o tempo atual do simulador e adiciona esses processos na primeira lista de prontos
function checkProcesses() {
  while (processes.length > 0 && processes[0].arrivalTime <= simulatorTime) {
    
    processes[0].state = "pronto";
    Interface.log(`O processo ${processes[0].name} saiu do estado de "Novo" e foi para o estado de "Pronto" em t = ${simulatorTime}.`);

    // Decide a fila para onde o processo vai baseado na prioridade
    if (processes[0].priority == 0) priorityQueue.push(processes[0]);
    else ready1.push(processes[0]);
  
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

  // Percorrendo todas as CPUs
  CPUs.forEach((CPU, index) => {
    // Se tem processo ocupando a CPU
    if (CPU.process) {

      // Se o processo chegou ao final de sua execução
      if (CPU.process.remainingTime <= 0) {
        Interface.log(`O processo ${CPU.process.name} terminou na CPU ${index+1} em t = ${simulatorTime - 1}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Finalizado" em t = ${simulatorTime - 1}.`);
        CPU.process.state = "finalizado";
        CPU.process.endTime = simulatorTime - 1;
        finishedProcesses.push(CPU.process);
        resetCpu(CPU);
      }

      // Se o processo chegou no quantum
      else if (CPU.quantumCounter == 2) {
        Interface.log(`O processo ${CPU.process.name} liberou a CPU ${index+1} em razão do quantum em t = ${simulatorTime - 1}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${simulatorTime - 1}.`);
        CPU.process.state = "pronto";

        // Enviando o processo pra lista n+1 (sendo n a lista de onde ele veio)
        if (CPU.lastQueue == 1) ready2.push(CPU.process);
        else if (CPU.lastQueue == 2 || CPU.lastQueue == 3) ready3.push(CPU.process);
        resetCpu(CPU);
      }

      // Se o processo continua em execução
      else {
        CPU.process.remainingTime -= 1;

        // Impede que o processo de tempo real sofra interrupção por fatia de tempo
        if (CPU.process.priority == 1) CPU.quantumCounter += 1;
      }
    }

    // Se não tem processo na CPU e ainda tem processos na fila de prioridade
    // Tratar essa repetição de código mais tarde (dois ifs do priority)
    if (priorityQueue.length > 0) {

      // Se não tem processo na CPU
      if (!CPU.process) {
        CPU.process = priorityQueue.shift();
        CPU.lastQueue = 0;
        CPU.output.innerHTML = CPU.process.name;
        CPU.output.classList.add('activeProcess');
        CPU.quantumCounter = 1;
        CPU.process.remainingTime -= 1;
        Interface.log(`O processo ${CPU.process.name} chegou da fila de prioridade na CPU ${index+1} em t = ${simulatorTime}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado de "Pronto" para o estado de "Executando" em t = ${simulatorTime}.`)
      }

      // Se tem processo na CPU e a prioridade dele é inferior
      else if (CPU.process && CPU.process.priority == 1) {
        Interface.log(`O processo ${CPU.process.name} liberou a CPU ${index+1} em função da chegada do processo ${priorityQueue[0].name} de maior prioridade em t = ${simulatorTime}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${simulatorTime}.`);

        CPU.process.state = "pronto";

        // Enviando o processo pra lista n+1 (sendo n a lista de onde ele veio)
        if (CPU.lastQueue == 1) ready2.push(CPU.process);
        else if (CPU.lastQueue == 2 || CPU.lastQueue == 3) ready3.push(CPU.process);
        resetCpu(CPU);

        CPU.process = priorityQueue.shift();
        CPU.lastQueue = 0;
        CPU.output.innerHTML = CPU.process.name;
        CPU.output.classList.add('activeProcess');
        CPU.quantumCounter = 1;
        CPU.process.remainingTime -= 1;
        Interface.log(`O processo ${CPU.process.name} chegou da fila de prioridade na CPU ${index+1} em t = ${simulatorTime}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado "Executando" em t = ${simulatorTime}.`);
        CPU.process.state = "executando";
      }
    }

    // Se não tem processo na CPU e ainda tem processos nas filas de pronto
    else if (CPU.process == undefined && (ready1.length > 0 || ready2.length > 0 || ready3.length > 0)) {

      // Escolhendo a fila e salvando a informação dela na CPU
      if (ready1.length > 0) {
        CPU.process = ready1.shift();
        CPU.lastQueue = 1;
      }
      else if (ready2.length > 0) {
        CPU.process = ready2.shift();
        CPU.lastQueue = 2;
      }
      else {
        CPU.process = ready3.shift();
        CPU.lastQueue = 3;
      }

      // Alterando o output da CPU
      CPU.output.innerHTML = CPU.process.name;
      CPU.output.classList.add('activeProcess');

      // Inicializando/atualizando os contadores do processo que chegou
      CPU.quantumCounter = 1;
      CPU.process.remainingTime -= 1;

      Interface.log(`O processo ${CPU.process.name} chegou da fila ${CPU.lastQueue} de prontos na CPU ${index+1} em t = ${simulatorTime}.`);
      Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado "Executando" em t = ${simulatorTime}.`);

    }
  });
}

// Restaura a CPU para as configurações iniciais
function resetCpu(cpu) {
  cpu.process = undefined;
  cpu.output.classList.remove('activeProcess');
  cpu.quantumCounter = 0;
  cpu.output.innerHTML = '';
}

// Atualiza as filas de pronto
// Tratar essa repetição de código mais tarde
function updateQueues() {
  ready1Output.innerHTML = '';
  ready1.forEach(e => {
    let li = document.createElement('li');
    li.classList.add('readyItem')
    li.textContent = e.name;
    ready1Output.appendChild(li);
  });

  ready2Output.innerHTML = '';
  ready2.forEach(e => {
    let li = document.createElement('li');
    li.classList.add('readyItem')
    li.textContent = e.name;
    ready2Output.appendChild(li);
  });

  ready3Output.innerHTML = '';
  ready3.forEach(e => {
    let li = document.createElement('li');
    li.classList.add('readyItem')
    li.textContent = e.name;
    ready3Output.appendChild(li);
  });

  priorityQueueOutput.innerHTML = '';
  priorityQueue.forEach(e => {
    let li = document.createElement('li');
    li.classList.add('readyItem');
    li.textContent = e.name;
    priorityQueueOutput.appendChild(li);
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
      state: "novo"
    }
  }

  // Ordenando os processos por arrivalTime
  processes.sort((a, b) => {
    return a.arrivalTime - b.arrivalTime;
  });

  // Nomeando os processos agora ordenados por arrival time e atualizando o output de processos
  for (i=0; i<processes.length;i++) {
    processes[i].name = `P${i}`;
    outputText += `${processes[i].name}: ${processes[i].arrivalTime}, ${processes[i].priority}, ${processes[i].processorTime}, ${processes[i].mBytes}, ${processes[i].printer}, ${processes[i].disk}<br><br>`;
  }
  outputDiv.innerHTML=outputText;

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

var Interface = {
  output: document.getElementById('eventsOutput'),
  log: function(text) {
    let p = document.createElement('p');
    p.textContent = text;
    Interface.output.appendChild(p);
    Interface.output.scroll({
      top: Interface.output.scrollHeight,
      behavior: 'smooth'
    });
  }
};

