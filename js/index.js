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
var suspendedPriority = [];

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

  // Tratando as strings dos processos
  for(i=0;i<processes.length;i++) {
    processes[i] = processes[i].replaceAll(' ', '');
    processes[i] = processes[i].split(',');
  }

  // Ordenando os processos por arrivalTime
  processes.sort((a, b) => {
    return parseInt(a[0]) - parseInt(b[0]);
  });

  // Criando a lista de processos e atualizando o output
  for(i=0;i<processes.length;i++) {
    // Criando o novo objeto de processo
    processes[i] = new Process(i, processes[i][0], processes[i][1], processes[i][2], processes[i][3], processes[i][4], processes[i][5]);

    // Atualizando o output do menu
    Interface.outputP.innerHTML += `${processes[i].name}: ${processes[i].arrivalTime}, ${processes[i].priority}, ${processes[i].processorTime}, ${processes[i].size}, ${processes[i].printer}, ${processes[i].disk}<br><br>`;
  }}

// Inicia o simulador
function start() {

  // Define quantos segundos cada loop do simulador irá durar (1000 = 1s)
  const t = parseFloat(document.getElementById("timeInput").value) * 1000;

  // Pega o modo de exibição de informações escolhido
  infoMode = parseInt(document.querySelector('input[name="infoMode"]:checked').value);

  Interface.changeView();
  var simulationLoop = setInterval(() => {    
    try {
      checkSuspended();
      checkProcesses();
      updateCPUs();
      Interface.updateQueues();
      Interface.updateMemory();
      checkEndSimulation(simulationLoop);
      updateTimer();
    }
    catch (e) {
      console.error(e);
      clearInterval(simulationLoop);
    }
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
    
    while (suspendedPriority.length > 0 && swapped == true) {
      swapped = allocateProcess(suspendedPriority[0]);
      if (swapped) {
        Interface.log(`O processo ${suspendedPriority[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${simulatorTime}.`);
        suspendedPriority[0].state = 'pronto';
        priorityQueue.push(suspendedPriority[0]);
        suspendedPriority.shift();
      }
    }

    while (suspended.length > 0 && swapped == true) {
      swapped = allocateProcess(suspended[0]);
      if (swapped) {
        Interface.log(`O processo ${suspended[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${simulatorTime}.`);
        suspended[0].state = 'pronto';
        ready1.push(suspended[0]);
        suspended.shift();
      }
    }

    while (suspendedBlocked.length > 0 && swapped == true) {
      swapped = allocateProcess(suspendedBlocked[0]);
      if (swapped) {
        Interface.log(`O processo ${suspended[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${simulatorTime}.`);
        suspendedBlocked[0].state = 'pronto';
        ready1.push(suspendedBlocked[0]);
        suspendedBlocked.shift();
      }
    }
}

// Compara os tempos de chegada do array de processos com o tempo atual do simulador e adiciona esses processos na primeira lista de prontos
function checkProcesses() {
  while (processes.length > 0 && processes[0].arrivalTime <= simulatorTime) {

    // Adicionando novo processo na memória
    allocated = allocateProcess(processes[0]);

    // Se não foi possível alocar o processo (prioridade 1) ele é enviado para a lista de suspensos
    if (!allocated && processes[0].priority == 1) {
      processes[0].state = "suspenso";
      Interface.log(`O processo ${processes[0].name} saiu do estado "Novo" e foi para o estado de "Suspenso" em t = ${simulatorTime}`)
      suspended.push(processes[0]);
    }

    // Se não foi possivel alocar o processo (prioridade 0) é realizada uma troca
    else if (!allocated && processes[0].priority == 0) {
      if (!prioritySwap(processes[0])){
        if (!brutePrioritySwap(processes[0])) {
          if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de suspensos com prioridade em t = ${simulatorTime}.`);
          Interface.log(`O processo ${processes[0].name} saiu do estado "Novo" para "Suspenso".`);
          suspendedPriority.push(processes[0]);
        }
      }

    }

    // Se o processo foi alocado com sucesso, escolhe-se a fila para onde ele irá baseado em sua prioridade
    else {
      processes[0].state = "pronto";
      Interface.log(`O processo ${processes[0].name} saiu do estado "Novo" e foi para o estado de "Pronto" em t = ${simulatorTime}.`);

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

// Busca um processo de prioridade 1 nas filas para fazer Swapping out e dar espaço ao novo de prioridade 0
function prioritySwap(process){
  
  let queues = [blocked, ready3, ready2, ready1];
  
  // Percorrendo as filas em busca de um processo para sofrer swapping-out
  for (z = 0; z < queues.length; z++) {
    for (j = 0; j < queues[z].length; j++) {
      
      // Se o processo encontrado tem tamanho maior que o que queremos alocar ele é retirado de memória
      if (queues[z][j].size >= process.size) {
        
        // Se o processo está bloqueado deve ir para a fila de bloqueados-suspensos
        if (z == 0) {
          if (infomode) Interface.log(`O processo ${queues[z][j].name} saiu da fila de Bloqueados e foi enviado para a fila de Bloqueados/Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocado em t = ${simulatorTime}.`);
          Interface.log(`O processo ${queues[z][j].name} saiu do estado "Bloqueado" para o estado "Bloqueado/Suspenso" em t = ${simulatorTime}`);
          suspendedBlocked.push(queues[z][j]); 
          queues[z][j].state = "bloqueado/suspenso";
        }
        // Caso o processo não esteja bloqueado, vai para a fila de suspensos
        else {
          if (infoMode) Interface.log(`O processo ${queues[z][j].name} saiu da fila de Prontos e foi enviado para a fila de Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocado em t = ${simulatorTime}.`);
          Interface.log(`O processo ${queues[z][j].name} saiu do estado "Pronto" para o estado "Suspenso" em t = ${simulatorTime}`);
          suspended.push(queues[z][j]);
          queues[z][j].state = "suspenso";
        }

        deallocateProcess(queues[z][j]);
        if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prioridade em t = ${simulatorTime}.`);
        Interface.log(`O processo ${processes[0].name} saiu de "Novo" para "Pronto" em t = ${simulatorTime}.`);
        process.state = 'pronto';
        priorityQueue.push(process);

        // Removendo o processo da 
        switch (z) {
          case 0:
            blocked = blocked.filter(e => blocked.indexOf(e) != j);
            break;
          case 1:
            ready3 = ready3.filter(e => ready3.indexOf(e) != j);
            break;
          case 2:
            ready2 = ready2.filter(e => ready2.indexOf(e) != j);
            break;
          case 3:
            ready1 = ready1.filter(e => ready1.indexOf(e) != j);
            break;
        }

        // Adicionando novo processo na memória
        allocateProcess(process);

        return true;
      }
    }
  }

  return false;
}

// Implementando o swap de processos com força bruta caso não tenha um processo alocado com tamanho maior que o novo
function brutePrioritySwap(process){
  let queues = [blocked, ready3, ready2, ready1];

  let q = 0;
  let allocated = 0;

  // Retirando os processos das filas com força bruta
  while (!allocated) {

    if (queues[q].length == 0) {
      q++;
      if (q == 4) break;
      continue;
    }

    if (q == 0) {
      if (infoMode) Interface.log(`O processo ${blocked[0].name} saiu da fila de Bloqueados e foi enviado para a fila de Bloqueados/Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocadoem t = ${simulatorTime}.`);
      Interface.log(`O processo ${blocked[0].name} saiu do estado "Bloqueado" para o estado "Bloqueado/Suspenso" em t = ${simulatorTime}`);
      suspendedBlocked.push(queues[q][0]);
      queues[q][0].state = 'bloqueado/suspenso';
    }
    else {
      if (infoMode) Interface.log(`O processo ${queues[q][0].name} saiu da fila de Prontos e foi enviado para a fila de Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocadoem t = ${simulatorTime}.`);
      Interface.log(`O processo ${queues[q][0].name} saiu do estado "Pronto" para o estado "Suspenso" em t = ${simulatorTime}`);
      suspended.push(queues[q][0]);
      queues[q][0].state = 'suspenso';
    }

    deallocateProcess(queues[q][0]);
    queues[q].shift();

    allocated = allocateProcess(process);
  }

  // Se o processo não conseguiu ser alocado, checar as CPUs
  let i = 0;
  while (!allocated) {
    if (i == 4) break;
    if (CPUs[i].process == undefined || CPUs[i].process.priority == 0) {
      i++;
      continue;
    };

    if (infoMode) Interface.log(`O processo ${CPUs[i].process.name} liberou a CPU ${i + 1} e foi enviado para a fila de Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocado em t = ${simulatorTime}.`);
    Interface.log(`O processo ${CPUs[i].process.name} saiu do estado "Executando" para o estado "Suspenso" em t = ${simulatorTime}.`);
    CPUs[i].process.state = "suspenso";

    // Enviando o processo pra lista n+1 (sendo n a lista de onde ele veio)
    suspended.push(CPUs[i].process);
    deallocateProcess(CPUs[i].process);
    resetCpu(CPUs[i]);

    allocated = allocateProcess(process);
  }

  if (allocated) {
    if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prioridade em t = ${simulatorTime}.`);
    Interface.log(`O processo ${processes[0].name} saiu de "Novo" para "Pronto" em t = ${simulatorTime}.`);
    process.state = 'pronto';
    priorityQueue.push(process);  
    return true;
  }

  return false;
}

// Aloca o processo no bloco de memória encontrado previamente 
function allocateProcess(process) {
  let empty = -1;

  // Buscando um espaço de memória
  for (i = 0; i < freeMemory.length; i++) {
    if (freeMemory[i].size >= process.size) {
      empty = i;
      break;
    }
  }

  // Caso não tenha encontrado espaço vazio
  if (empty == -1) return false;

  // Adicionando o novo bloco de memória ocupado 
  occupiedMemory.push({
    process: process.id,
    start: freeMemory[empty].start,
    size: process.size
  });

  // Atualizando a lista de blocos livres
  if (freeMemory[empty].size == process.size) {
    freeMemory = freeMemory.filter(e => freeMemory.indexOf(e) != empty);
  }
  else {
    freeMemory[empty].size -= process.size;
    freeMemory[empty].start += process.size;
  }

  if (infoMode) Interface.log(`O processo ${process.name} foi alocado no bloco de memória iniciado em ${occupiedMemory[occupiedMemory.length - 1].start} e com tamanho de ${occupiedMemory[occupiedMemory.length - 1].size}MBytes em t = ${simulatorTime}.`);

  return true;
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
        checkSuspended();
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
        Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado de "Executando" em t = ${simulatorTime}.`)
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
  outputSPQ: document.getElementById('suspended_priority'),
  outputSBQ: document.getElementById('suspended_blocked'),
  updateQueues: function() {
    Interface._updateQueue(priorityQueue, Interface.outputPQ);
    Interface._updateQueue(ready1, Interface.outputR1Q);
    Interface._updateQueue(ready2, Interface.outputR2Q);
    Interface._updateQueue(ready3, Interface.outputR3Q);
    Interface._updateQueue(suspended, Interface.outputSQ);
    Interface._updateQueue(suspendedPriority, Interface.outputSPQ);
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