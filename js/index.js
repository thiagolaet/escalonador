// Inicializando as constantes dos elementos HTML
const fileInput = document.getElementById('fileInput');
const timer = document.getElementById('timer');

// Lista com os 4 objetos de CPU
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

// Timer do simulador e listas de processos
var simulatorTime = 0;
var processes = [];
var finishedProcesses = [];

// Listas e variável utilizadas para gerenciar a memória
var freeMemory = [
  {
  start: 0,
  size: 16000
}];
var occupiedMemory = [];

// Lista dos processos suspensos
var suspended = [];
var suspendedBlocked = [];

// Lista dos processos bloqueados
var blocked = [];

// Fila dos processos sem prioridade (Feedback)
var ready1 = [];
var ready2 = [];
var ready3 = [];

// Fila dos processos de tempo real (FCFS)
var priorityQueue = [];

var infoMode;

// Altera a lista de processos quando é recebido um novo input de arquivo
fileInput.addEventListener('change', function() { 
  var fr=new FileReader(); 
  fr.onload=function(){ 
    fillProcesses(fr.result);
  } 
  Interface.outputP.classList.remove('hidden');
    
  fr.readAsText(this.files[0]); 
});

// Classe processo
class Process {
  constructor (id, arrivalTime, priority, processorTime, size, printer, disk) {
    // Informações advindas do arquivo de entrada
    this.arrivalTime = parseInt(arrivalTime);
    this.priority = parseInt(priority);
    this.processorTime = parseInt(processorTime);
    this.size = parseInt(size);
    this.printer = parseInt(printer);
    this.disk = parseInt(disk);

    // Informações para controle do processo dentro do sistema
    this.id = id;
    this.name = `P${id}`;
    this.state = "novo";
    this.remainingTime = parseInt(processorTime);
  }
}

// Preenche a lista de objetos processos e atualiza o output relativo a eles no menu
function fillProcesses(text) {
  // Filtrando o input recebido pelo arquivo de texto
  processes = text.split('\n').filter((e) => e.length >= 6);

  // Ordenando os processos por arrivalTime
  processes.sort((a, b) => {
    return parseInt(a[0]) - parseInt(b[0]);
  });

  // Transformando os processos da lista em objetos "Process"
  for(i=0;i<processes.length;i++) {
    processes[i] = processes[i].replaceAll(' ', '');
    processes[i] = processes[i].split(',');

    // Criando o novo objeto de processo
    processes[i] = new Process(i, processes[i][0], processes[i][1], processes[i][2], processes[i][3], processes[i][4], processes[i][5]);

    // Atualizando o output do menu
    Interface.outputP.innerHTML += `${processes[i].name}: ${processes[i].arrivalTime}, ${processes[i].priority}, ${processes[i].processorTime}, ${processes[i].size}, ${processes[i].printer}, ${processes[i].disk}<br><br>`;
  }
}

// Inicia o simulador
function start() {

  // Define quantos segundos cada loop do simulador irá durar (1000 = 1s)
  const t = parseFloat(document.getElementById("timeInput").value) * 1000;

  // Pega o modo de exibição de informações escolhido
  infoMode = parseInt(document.querySelector('input[name="infoMode"]:checked').value);

  Interface.changeView();
  var simulationLoop = setInterval(() => {    
    checkSuspended();
    checkProcesses();
    updateCPUs();
    Interface.updateQueues();
    Interface.updateMemory();
    checkEndSimulation(simulationLoop);
    updateTimer();
  }, t);
}

// Checa se ainda existem processos em execução ou para serem executados, se não tiver termina a simulação
function checkEndSimulation(simulationLoop) {
  if (ready1.length == 0 && ready2.length == 0 && ready3.length == 0 && processes.length == 0 && blocked.length == 0 && suspendedBlocked.length == 0 && suspended.length == 0 && !CPUs[0].process && !CPUs[1].process && !CPUs[2].process && !CPUs[3].process) {
    Interface.log(`A simulação terminou em t = ${simulatorTime}.`);
    clearInterval(simulationLoop);
  }
}


// Busca processos na lista de suspensos e faz swapping in até encontrar um processo que não faça
function checkSuspended() {
    let swapped = true;
    while (suspended.length > 0 && swapped == true) {
        swapped = false;
        // Buscando um espaço livre onde o processo caiba
        for (i = 0; i < freeMemory.length; i++) {
            if (freeMemory[i].size >= suspended[0].size) {
              Interface.log(`O processo ${suspended[0].name} saiu do estado "Suspenso" para o estado "Pronto" em t = ${simulatorTime}.`);
              suspended[0].state = 'pronto';
              allocateProcess(suspended[0], i);
              ready1.push(suspended[0]);
              suspended.shift();
              swapped = true;
              break;
            }
        }
    }
}

// Compara os tempos de chegada do array de processos com o tempo atual do simulador e adiciona esses processos na primeira lista de prontos
function checkProcesses() {
  while (processes.length > 0 && processes[0].arrivalTime <= simulatorTime) {

    allocated = false;

    // Adicionando novo processo na memória
    for (i = 0; i < freeMemory.length; i++) {
      if (freeMemory[i].size >= processes[0].size) {
        allocateProcess(processes[0], i);
        allocated = true;
        break;
      }
    }

    // Se não foi possível alocar o processo (prioridade 1) ele é enviado para a lista de suspensos
    if (!allocated && processes[0].priority == 1) {
      processes[0].state = "suspenso";
      Interface.log(`O processo ${processes[0].name} saiu do estado de "Novo" e foi para o estado de "Suspenso" em t = ${simulatorTime}`)
      suspended.push(processes[0]);
    }

    // Se não foi possivel alocar o processo (prioridade 0) é realizada uma troca
    else if (!allocated && processes[0].priority == 0) {
      console.log(`Processo X saiu da lista de prontos para a de suspensos devido à chegada do processo ${processes[0].name} de tempo real.`);
      // substituteProcess(processes[0]);
    }

    // Se o processo foi alocado com sucesso, escolhe-se a fila para onde ele irá baseado em sua prioridade
    else {
      processes[0].state = "pronto";
      Interface.log(`O processo ${processes[0].name} saiu do estado de "Novo" e foi para o estado de "Pronto" em t = ${simulatorTime}.`);

      if (processes[0].priority == 0) {
        if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prioridade em t = ${simulatorTime}.`);
        priorityQueue.push(processes[0]);
      }
      else {
        if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prontos 1 em t = ${simulatorTime}.`);
        ready1.push(processes[0]);
      }
    }

    // Retira o processo da lista de processos a serem alocados
    processes.shift();
  }
}

// Aloca o processo no bloco de memória encontrado previamente 
function allocateProcess(process, freeIndex) {
  // Adicionando o novo bloco de memória ocupado 
  occupiedMemory.push({
    process: process.id,
    start: freeMemory[freeIndex].start,
    size: process.size
  });

  // Atualizando a lista de blocos livres
  if (freeMemory[freeIndex].size == process.size) {
    freeMemory = freeMemory.filter(e => freeMemory.indexOf(e) != freeIndex);
  }
  else {
    freeMemory[freeIndex].size -= process.size;
    freeMemory[freeIndex].start += process.size;
  }

  if (infoMode) Interface.log(`O processo ${process.name} foi alocado no bloco de memória iniciado em ${occupiedMemory[occupiedMemory.length - 1].start} e com tamanho de ${occupiedMemory[occupiedMemory.length - 1].size}MBytes em t = ${simulatorTime}.`);
}

// Desaloca um processo da memória e atualiza a lista de blocos livres
function deallocateProcess(process) {

  let deallocated = 0;

  // Percorrendo a lista de blocos ocupados até achar o processo
  let index;
  for (i = 0; i < occupiedMemory.length; i++) {
    if (process.id == occupiedMemory[i].process) {
      index = i;
      break;
    }
  }

  // Percorrendo a lista de blocos ocupados para formar o novo bloco
  for (i = 0; i < freeMemory.length; i++) {
    
    // Se o bloco de ocupado está logo antes de um bloco livre
    if (freeMemory[i].start - occupiedMemory[index].size == occupiedMemory[index].start) {
      freeMemory[i].start = occupiedMemory[index].start;
      freeMemory[i].size += occupiedMemory[index].size;
      occupiedMemory = occupiedMemory.filter(e => occupiedMemory.indexOf(e) != index);
      if (infoMode) Interface.log(`O processo ${process.name} foi desalocado da memória, criando o bloco livre iniciado em ${freeMemory[i].start} de ${freeMemory[i].size}MBytes em t = ${simulatorTime}.`);
      deallocated = 1;
      break;
    }

    // Se o bloco de ocupado está logo depois do bloco livre
    else if (freeMemory[i].start + freeMemory[i].size == occupiedMemory[index].start) {
      freeMemory[i].size += occupiedMemory[index].size;
      occupiedMemory = occupiedMemory.filter(e => occupiedMemory.indexOf(e) != index);
      if (infoMode) Interface.log(`O processo ${process.name} foi desalocado da memória, criando o bloco livre iniciado em ${freeMemory[i].start} de ${freeMemory[i].size}MBytes em t = ${simulatorTime}.`);
      deallocated = 1;
      break;
    } 
  }

  // Se o bloco de memória não tem vizinhos livres, cria-se um novo bloco de livres
  if (!deallocated) {
    freeMemory.push({
      start: occupiedMemory[index].start,
      size: occupiedMemory[index].size
    });
    occupiedMemory = occupiedMemory.filter(e => occupiedMemory.indexOf(e) != index);

    if (infoMode) Interface.log(`O processo ${process.name} foi desalocado da memória, criando o bloco livre iniciado em ${freeMemory[freeMemory.length-1].start} de ${freeMemory[freeMemory.length-1].size}MBytes em t = ${simulatorTime}.`);
  }

  // Ordenando a lista de livres pelo endereço do começo do bloco
   freeMemory.sort((a, b) => {
    return a.start - b.start;
  });

  // Buscando blocos seguidos de livres que podem surgir
  if (freeMemory.length > 1){
    for (i = 0; i < freeMemory.length - 1; i++) {
      if (freeMemory[i].start + freeMemory[i].size == freeMemory[i+1].start) {
        freeMemory[i].size += freeMemory[i+1].size;
        freeMemory = freeMemory.filter((e, j) => j != i+1);
        break;
      };
    }
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
        if (infoMode) Interface.log(`O processo ${CPU.process.name} terminou na CPU ${index+1} em t = ${simulatorTime}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Finalizado" em t = ${simulatorTime}.`);
        CPU.process.state = "finalizado";
        CPU.process.endTime = simulatorTime;
        deallocateProcess(CPU.process);
        finishedProcesses.push(CPU.process);
        resetCpu(CPU);
      }

      // Se o processo chegou no quantum
      else if (CPU.quantumCounter == 2) {

        if (infoMode) Interface.log(`O processo ${CPU.process.name} liberou a CPU ${index+1} em razão do quantum em t = ${simulatorTime}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${simulatorTime}.`);
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
        if (infoMode) (`O processo ${CPU.process.name} chegou da fila de prioridade na CPU ${index+1} em t = ${simulatorTime}.`);
        Interface.log(`O processo ${CPU.process.name} saiu do estado de "Pronto" para o estado de "Executando" em t = ${simulatorTime}.`)
      }

      // Se tem processo na CPU e a prioridade dele é inferior
      else if (CPU.process && CPU.process.priority == 1) {
        if (infoMode) Interface.log(`O processo ${CPU.process.name} liberou a CPU ${index+1} em função da chegada do processo ${priorityQueue[0].name} de maior prioridade em t = ${simulatorTime}.`);
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
        if (infoMode) Interface.log(`O processo ${CPU.process.name} chegou da fila de prioridade na CPU ${index+1} em t = ${simulatorTime}.`);
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

      if (infoMode) Interface.log(`O processo ${CPU.process.name} chegou da fila ${CPU.lastQueue} de prontos na CPU ${index+1} em t = ${simulatorTime}.`);
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

var Interface = {
  // Output dos processos no menu
  outputP: document.getElementById('processesOutput'),
  // Altera a visualização do programa (menu->simulador)
  outputMenu: document.querySelector('.menu'),
  outputSimulator: document.querySelector('.simulator'),
  changeView: function() {
    Interface.outputMenu.classList.toggle('hidden');
    Interface.outputSimulator.classList.toggle('hidden');
  },
  // Exibe a mensagem passada por parâmetro no console de eventos
  eventsOutput: document.getElementById('eventsOutput'),
  log: function(text) {
    let p = document.createElement('p');
    p.textContent = text;
    Interface.eventsOutput.appendChild(p);
    Interface.eventsOutput.scroll({
      top: Interface.eventsOutput.scrollHeight,
      behavior: 'smooth'
    });
  },
  // Atualiza a exibição dos elementos das filas
  _updateQueue: function(queue, output) {
    output.innerHTML = '';
    queue.forEach(e => {
      let li = document.createElement('li');
      li.classList.add('queuesItem');
      li.textContent = e.name;
      output.appendChild(li);
    });
  },
  outputPQ: document.getElementById('priorityQueue'),
  outputR1Q: document.getElementById('ready1'),
  outputR2Q: document.getElementById('ready2'),
  outputR3Q: document.getElementById('ready3'),
  outputBQ: document.getElementById('blocked'),
  outputSQ: document.getElementById('suspended'),
  outputSBQ: document.getElementById('suspended_blocked'),
  updateQueues: function() {
    Interface._updateQueue(priorityQueue, Interface.outputPQ);
    Interface._updateQueue(ready1, Interface.outputR1Q);
    Interface._updateQueue(ready2, Interface.outputR2Q);
    Interface._updateQueue(ready3, Interface.outputR3Q);
    Interface._updateQueue(suspended, Interface.outputSQ);
    Interface._updateQueue(blocked, Interface.outputBQ);
    Interface._updateQueue(suspendedBlocked, Interface.outputSBQ);
  },
  // Atualiza a exibição dos blocos de memória (utilizando divisão por 20 nos cálculos devido à escala utilizada)
  outputM: document.getElementById('memoryOutput'),
  _createBlock: function(mBlock, type) {
    let box = document.createElement('div');
    // Se for bloco de memória ocupada
    if (type == 0) {
      box.style.backgroundColor = 'cadetblue';
      if (mBlock.size/20 > 20) {
        let text = document.createElement('span');
        text.textContent = `P${mBlock.process}`;
        text.style.fontWeight = 'bold';
        text.style.alignSelf = 'center';
        text.style.fontSize = '12px';
        box.style.display = 'flex';
        box.style.justifyContent = 'center';
        box.appendChild(text);
      }
    } 
    else {
      box.style.backgroundColor = '#2C4251';
    }
    box.style.width = `${mBlock.size /20}px`;
    box.style.height = '72px';
    box.style.boxSizing = 'border-box';
    box.style.border = '1px solid black';
    box.style.position = 'absolute';
    box.style.left = `${mBlock.start/20}px`;
    box.style.alignSelf = 'center';
    Interface.outputM.appendChild(box);
  },
  updateMemory: function() {
    Interface.outputM.innerHTML = '';
    occupiedMemory.forEach(mBlock => {
      Interface._createBlock(mBlock, 0);
    });
    freeMemory.forEach(mBlock => {
      Interface._createBlock(mBlock, 1);
    });
  }
};