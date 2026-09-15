// ====================================================================
// ANT BRAIN — Experimental Biologically Inspired Multi-Agent Platform
// Created & Developed by Nikhilesh H. Chavda
// GitHub: https://github.com/Nik-2208 | Portfolio: https://nik-portfolio-lime.vercel.app/
// Copyright © 2026 Nikhilesh H. Chavda. All Rights Reserved.
// Model: ant_brain_model_v1_20260915_standard
// ====================================================================

const ANT_COLORS = [0xef4444, 0x00f2fe, 0x00e676, 0xffaa00, 0x9d4edd, 0xff2a85];
const ANT_COLORS_HEX = ["#ef4444", "#00f2fe", "#00e676", "#ffaa00", "#9d4edd", "#ff2a85"];

const KEYS_SINGLE = {
    'A': { x: 0.0, y: 1.5 }, 'B': { x: 1.0, y: 1.5 }, 'C': { x: 2.0, y: 1.5 },
    'D': { x: 0.0, y: 0.0 }, 'E': { x: 1.0, y: 0.0 }, 'F': { x: 2.0, y: 0.0 }
};

const KEYS_KBD_A = {
    'A_A': { x: -2.0, y: 1.0, label: 'A' }, 'A_B': { x: -1.0, y: 1.0, label: 'B' }, 'A_C': { x: 0.0, y: 1.0, label: 'C' },
    'A_D': { x: -2.0, y: 0.0, label: 'D' }, 'A_E': { x: -1.0, y: 0.0, label: 'E' }, 'A_F': { x: 0.0, y: 0.0, label: 'F' }
};

const KEYS_KBD_B = {
    'B_A': { x: 2.0, y: 1.0, label: 'A' }, 'B_B': { x: 3.0, y: 1.0, label: 'B' }, 'B_C': { x: 4.0, y: 1.0, label: 'C' },
    'B_D': { x: 2.0, y: 0.0, label: 'D' }, 'B_E': { x: 3.0, y: 0.0, label: 'E' }, 'B_F': { x: 4.0, y: 0.0, label: 'F' }
};

const KEY_RADIUS = 0.35;
const MAX_STEPS = 50;

const REGION_COLORS = {
    'ANTENNAL_LOBE': 0x00e676,
    'MUSHROOM_BODY_CALYX': 0x00f2fe,
    'MUSHROOM_BODY_PEDUNCLE': 0x00d2fe,
    'MUSHROOM_BODY_LOBES': 0x38bdf8,
    'CENTRAL_COMPLEX_EB': 0x9d4edd,
    'CENTRAL_COMPLEX_PB': 0xc084fc,
    'SUBESOPHAGEAL_ZONE': 0xffaa00,
    'VENTRAL_NERVE_CORD': 0xff3d71,
    'DEFAULT': 0x00f2fe
};

// --- GLOBAL STATE MANAGEMENT ---
let simState = {
    mode: 'COLLABORATIVE',
    antCount: 3,
    targetMode: 'SEQUENCE',
    singleKeyTarget: 'E',
    sequencePreset: 'DECAF',
    customSequence: 'DECAF',
    orderingMode: 'ORDERED',
    isPlaying: true,
    speed: 1.0,
    modelDir: 'ant_brain_model_v1_20260915_standard',
    stepCount: 0,
    completedTasksCount: 0,
    activeSequence: ['D', 'E', 'C', 'A', 'F'],
    currentSequenceIndex: 0,
    selectedRegion: 'ALL',
    viewLayoutMode: 'SPLIT',
    brainMapMode: 'WHOLE',
    signalPlaybackMode: 'LIVE',
    splitPercent: 50
};

let brainPackage = null;
let activeSelectedAntId = 1;
let selectedNeuronId = null;
let selectedSynapseId = null;
let activeInspectorSignal = null;

// Telemetry & Debug Counters
let totalNeuralEventsEmitted = 0;
let signalsQueuedCount = 0;
let signalsActiveCount = 0;
let signalsRenderedCount = 0;
let signalsCompletedCount = 0;
let resolvedSynapsesCount = 0;
let lastEmittedEvent = null;
let isCameraFollowingSignal = false;
let eventRateCounter = 0;
let currentEventsPerSec = 0;

setInterval(() => {
    currentEventsPerSec = eventRateCounter;
    eventRateCounter = 0;
}, 1000);

// --- AUTHORITATIVE REWARD CONFIGURATION & ENGINE ---
const REWARD_CONFIG = {
    // POSITIVE REWARDS
    TARGET_DISCOVERED: +0.10,
    CORRECT_KEY_PRESSED: +1.00,
    TASK_COMPLETED: +5.00,
    EFFICIENT_PATH: +0.05,
    USEFUL_COMMUNICATION: +0.20,
    SUCCESSFUL_COLLABORATION: +2.00,

    // NEGATIVE PENALTIES
    WRONG_KEY: -0.20,
    WRONG_TARGET: -0.15,
    INVALID_ACTION: -0.10,
    COLLISION: -0.05,
    STUCK_DETECTED: -0.10,
    TASK_ABANDONED: -0.20,
    TIMEOUT: -0.50,
    REPEATED_FAILED_ACTION: -0.15
};

class PerAntRewardState {
    constructor(antId) {
        this.antId = antId;
        this.episodeReward = 0.0;
        this.stepReward = 0.0;
        this.lastReward = 0.0;
        this.lastRewardReason = "INITIALIZED";
        this.positiveRewardTotal = 0.0;
        this.negativeRewardTotal = 0.0;
        this.rewardEventsCount = 0;
        this.punishmentEventsCount = 0;
        this.currentTaskReward = 0.0;
        this.currentTaskPenalty = 0.0;
        this.history = [];
    }

    resetEpisodic() {
        this.stepReward = 0.0;
        this.currentTaskReward = 0.0;
        this.currentTaskPenalty = 0.0;
    }
}

class AuthoritativeRewardEngine {
    constructor() {
        this.processedRewardEvents = new Set();
        this.rewardLog = [];
        this.duplicateEventCounter = 0;
        this.invalidEventCounter = 0;
        this.rewardLoopsCounter = 0;
        this.nanInfinityCounter = 0;
    }

    clear() {
        this.processedRewardEvents.clear();
        this.rewardLog = [];
        this.duplicateEventCounter = 0;
        this.invalidEventCounter = 0;
        this.rewardLoopsCounter = 0;
        this.nanInfinityCounter = 0;
    }

    emitRewardEvent({ ant, taskId, eventType, action, reason, customValue }) {
        if (!ant || !ant.rewardState) {
            this.invalidEventCounter++;
            return 0.0;
        }

        const now = performance.now();
        const eventId = `REVT_${ant.id}_${taskId || 'GEN'}_${eventType}_${Math.round(now * 100)}`;

        // IDEMPOTENCY CHECK: Prevent duplicate reward evaluation for the same event
        if (this.processedRewardEvents.has(eventId)) {
            this.duplicateEventCounter++;
            return 0.0;
        }

        let baseVal = customValue !== undefined ? customValue : (REWARD_CONFIG[eventType] || 0.0);

        // Sanity & NaN/Infinity Check
        if (isNaN(baseVal) || !isFinite(baseVal)) {
            this.nanInfinityCounter++;
            appendTerminalLog(`[REWARD ENGINE ERROR] NaN/Infinity reward rejected for Ant #${ant.id}!`, "text-amber");
            return 0.0;
        }

        // Clamp single event magnitude to [-10.0, +10.0]
        baseVal = Math.max(-10.0, Math.min(10.0, baseVal));

        this.processedRewardEvents.add(eventId);

        // Update Per-Ant Isolated Reward State
        const rState = ant.rewardState;
        rState.stepReward = baseVal;
        rState.lastReward = baseVal;
        rState.lastRewardReason = reason || eventType;
        rState.episodeReward += baseVal;

        if (baseVal > 0) {
            rState.positiveRewardTotal += baseVal;
            rState.rewardEventsCount++;
            rState.currentTaskReward += baseVal;
        } else if (baseVal < 0) {
            rState.negativeRewardTotal += Math.abs(baseVal);
            rState.punishmentEventsCount++;
            rState.currentTaskPenalty += Math.abs(baseVal);
        }

        ant.totalReward = rState.episodeReward;

        const logEntry = {
            timestamp: now,
            formattedTime: new Date().toISOString().substr(14, 7),
            antId: ant.id,
            taskId: taskId || 'N/A',
            eventId: eventId,
            eventType: eventType,
            action: action || 'N/A',
            reward: baseVal,
            reason: reason || eventType
        };

        this.rewardLog.unshift(logEntry);
        if (this.rewardLog.length > 50) this.rewardLog.pop();

        const colorClass = baseVal > 0 ? "text-green" : (baseVal < 0 ? "text-amber" : "text-muted");
        appendTerminalLog(`[REWARD ENGINE] ANT #${ant.id} | TASK: ${taskId || 'GEN'} | ${eventType} | ${baseVal >= 0 ? '+' : ''}${baseVal.toFixed(2)} (${reason || eventType})`, colorClass);

        return baseVal;
    }
}

const rewardEngine = new AuthoritativeRewardEngine();

// Single Authoritative Neural Event Definition
class NeuralEvent {
    constructor({ id, timestamp, antId, neuronId, type, membraneState, preNeuronId, postNeuronId, synapseId, weight, delay }) {
        this.id = id || `EVT_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        this.timestamp = timestamp || performance.now();
        this.antId = antId;
        this.neuronId = neuronId;
        this.type = type || "SYNAPSE_TRANSMISSION";
        this.membraneState = membraneState;
        this.preNeuronId = preNeuronId;
        this.postNeuronId = postNeuronId;
        this.synapseId = synapseId;
        this.weight = weight !== undefined ? weight : 0.5;
        this.delay = delay !== undefined ? delay : 1.5;
    }
}

// Realtime Active Signal Transmission Packets
let activeSignalPackets = [];
let recordedSignalHistory = [];

// --- REALTIME NEURAL EVENT BUS ---
class NeuralEventBus {
    constructor() {
        this.subscribers = [];
    }

    subscribe(handler) {
        this.subscribers.push(handler);
    }

    publish(event) {
        totalNeuralEventsEmitted++;
        signalsQueuedCount++;
        eventRateCounter++;
        lastEmittedEvent = event;
        this.subscribers.forEach(handler => handler(event));
    }
}

const neuralBus = new NeuralEventBus();

// --- EXECUTABLE INSTRUMENTED ANT BRAIN (LIF IMPLEMENTATION) ---
class JSAntBrain {
    constructor(antId, manifest, neurons, synapses) {
        this.antId = antId;
        this.manifest = manifest || {};
        this.neurons = neurons || [];
        this.synapses = synapses || [];
        this.neuronStates = {};
        this.spikes = {};
        this.lastFiredNeurons = [];
        this.lastTransmissions = [];
        this.causalTraceLog = [];
        this.reset();
    }

    reset() {
        if (this.neurons.length === 0) {
            for (let i = 0; i < 128; i++) {
                this.neurons.push({ id: `NEURON_${String(i).padStart(4, '0')}`, resting_potential: -65, threshold: -45, region: 'DEFAULT' });
            }
        }
        this.neurons.forEach(n => {
            this.neuronStates[n.id] = n.resting_potential || -65;
            this.spikes[n.id] = false;
        });
        this.lastFiredNeurons = [];
        this.lastTransmissions = [];
        this.causalTraceLog = [];
    }

    fireNeuronManually(targetId) {
        const targetNeuron = this.neurons.find(n => n.id === targetId) || this.neurons[0];
        if (!targetNeuron) return;
        const nid = targetNeuron.id;
        const timestamp = performance.now();

        // Force spike state
        this.neuronStates[nid] = targetNeuron.threshold || -45;
        this.spikes[nid] = true;

        // Find actual outgoing synapses in modeled network
        const outgoing = this.synapses.filter(s => s.pre_neuron_id === nid);
        if (outgoing.length === 0) {
            appendTerminalLog(`[MANUAL FIRE WARNING] Neuron ${nid} activated, but no outgoing synapses exist in model!`, "text-amber");
        } else {
            outgoing.forEach(s => {
                const event = new NeuralEvent({
                    timestamp: timestamp,
                    antId: this.antId,
                    neuronId: nid,
                    type: "SYNAPSE_TRANSMISSION",
                    membraneState: targetNeuron.threshold || -45,
                    preNeuronId: nid,
                    postNeuronId: s.post_neuron_id,
                    synapseId: s.synapse_id || `${nid}->${s.post_neuron_id}`,
                    weight: s.weight || 0.5,
                    delay: s.delay_ms || 1.5
                });

                if (this.antId === activeSelectedAntId) {
                    neuralBus.publish(event);
                }
            });
        }

        const spikeEvent = new NeuralEvent({
            timestamp: timestamp,
            antId: this.antId,
            neuronId: nid,
            type: "SPIKE",
            membraneState: targetNeuron.threshold || -45,
            preNeuronId: nid,
            postNeuronId: null,
            synapseId: null,
            weight: 1.0,
            delay: 0
        });

        if (this.antId === activeSelectedAntId) {
            neuralBus.publish(spikeEvent);
        }

        appendTerminalLog(`[MANUAL FIRE] Triggered neuron ${nid} dynamics for ANT #${this.antId}. Emitted outgoing signal events!`, "text-green");
    }

    step(sensoryInputs, dt = 0.016) {
        const foodLeft = sensoryInputs.foodLeft || 0.0;
        const foodCenter = sensoryInputs.foodCenter || 0.0;
        const foodRight = sensoryInputs.foodRight || 0.0;
        const foodOdor = sensoryInputs.foodOdorConcentration || 0.0;

        const firedThisStep = [];
        const transmissionsThisStep = [];
        const timestamp = performance.now();

        // 1. SENSORY DRIVE -> INPUT NEURONS
        for (let i = 0; i < Math.min(10, this.neurons.length); i++) {
            const nid = this.neurons[i].id;
            let sensoryDrive = (foodLeft * 10.0) + (foodCenter * 15.0) + (foodRight * 10.0) + (foodOdor * 8.0);
            this.neuronStates[nid] += sensoryDrive * dt;
        }

        // 2. SYNAPSE TRANSMISSION FROM PREVIOUS OR ACTIVE SPIKES
        this.synapses.forEach(s => {
            // Propagate signal if pre-neuron spiked or is depolarizing above threshold range
            const preMembrane = this.neuronStates[s.pre_neuron_id] || -65.0;
            if (this.spikes[s.pre_neuron_id] || preMembrane > -52.0) {
                const sign = s.type === "EXCITATORY" ? 1.0 : -1.0;
                if (this.neuronStates[s.post_neuron_id] !== undefined) {
                    this.neuronStates[s.post_neuron_id] += sign * (s.weight || 0.5) * 8.0;

                    const event = {
                        timestamp: timestamp,
                        antId: this.antId,
                        neuronId: s.pre_neuron_id,
                        eventType: "SYNAPSE_TRANSMISSION",
                        membraneValue: this.neuronStates[s.post_neuron_id],
                        threshold: -45,
                        preNeuronId: s.pre_neuron_id,
                        postNeuronId: s.post_neuron_id,
                        synapseId: s.synapse_id || `${s.pre_neuron_id}->${s.post_neuron_id}`,
                        weight: s.weight || 0.5,
                        delay: s.delay_ms || 1.5,
                        type: s.type || "EXCITATORY"
                    };

                    transmissionsThisStep.push(event);

                    if (this.antId === activeSelectedAntId) {
                        neuralBus.publish(event);
                    }
                }
            }
        });

        // 3. NEURON SPIKE GENERATION & LEAK INTEGRATION
        this.neurons.forEach(n => {
            const nid = n.id;
            const thresh = n.threshold || -45;
            const rest = n.resting_potential || -65;
            if (this.neuronStates[nid] >= thresh) {
                this.spikes[nid] = true;
                this.neuronStates[nid] = rest;
                firedThisStep.push(nid);

                // Find actual outgoing synapses in modeled network
                const outgoing = this.synapses.filter(s => s.pre_neuron_id === nid);
                if (outgoing.length === 0) {
                    appendTerminalLog(`[NEURAL MODEL WARNING] Neuron ${nid} activated, but no outgoing synaptic connection exists in model!`, "text-amber");
                } else {
                    outgoing.forEach(s => {
                        const event = {
                            timestamp: timestamp,
                            antId: this.antId,
                            neuronId: nid,
                            eventType: "SYNAPSE_TRANSMISSION",
                            membraneValue: thresh,
                            threshold: thresh,
                            preNeuronId: nid,
                            postNeuronId: s.post_neuron_id,
                            synapseId: s.synapse_id || `${nid}->${s.post_neuron_id}`,
                            weight: s.weight || 0.5,
                            delay: s.delay_ms || 1.5,
                            type: s.type || "EXCITATORY"
                        };
                        transmissionsThisStep.push(event);
                        if (this.antId === activeSelectedAntId) {
                            neuralBus.publish(event);
                        }
                    });
                }

                const spikeEvent = {
                    timestamp: timestamp,
                    antId: this.antId,
                    neuronId: nid,
                    eventType: "SPIKE",
                    membraneValue: thresh,
                    threshold: thresh,
                    preNeuronId: nid,
                    postNeuronId: null,
                    synapseId: null,
                    weight: 1.0,
                    delay: 0
                };

                if (this.antId === activeSelectedAntId) {
                    neuralBus.publish(spikeEvent);
                }
            } else {
                this.spikes[nid] = false;
                const leak = (rest - this.neuronStates[nid]) * 0.1;
                this.neuronStates[nid] += leak;
            }
        });

        // 4. MOTOR READOUT CIRCUIT
        const motorNeurons = this.neurons.slice(-10);
        let motorSum = 0;
        motorNeurons.forEach(n => { if (this.spikes[n.id]) motorSum += 1; });

        const targetAngle = Math.atan2(sensoryInputs.targetY - sensoryInputs.antY, sensoryInputs.targetX - sensoryInputs.antX);
        let relAngle = targetAngle - sensoryInputs.antTheta;
        while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

        const turn = Math.tanh(relAngle * 1.5 + (motorSum > 0 ? 0.1 : 0.0));
        const throttle = 0.5 + 0.5 * Math.cos(relAngle);

        let actionName = "MOVE_FORWARD";
        if (turn > 0.3) actionName = "STEER_RIGHT";
        else if (turn < -0.3) actionName = "STEER_LEFT";

        this.lastFiredNeurons = firedThisStep;
        this.lastTransmissions = transmissionsThisStep;

        if (firedThisStep.length > 0 || transmissionsThisStep.length > 0) {
            const sensoryNeuron = this.neurons[0]?.id || "SENSORY_0";
            const firedInter = firedThisStep.find(id => id !== sensoryNeuron) || firedThisStep[0] || "NEURON_0001";
            const transmission = transmissionsThisStep[0];
            const motorNeuron = motorNeurons.find(n => this.spikes[n.id])?.id || motorNeurons[0]?.id || "NEURON_0120";

            this.causalTraceLog.unshift({
                step: simState.stepCount,
                sensory: `SENSORS (dist=${Math.sqrt((sensoryInputs.targetX-sensoryInputs.antX)**2+(sensoryInputs.targetY-sensoryInputs.antY)**2).toFixed(2)}m)`,
                sensoryNeuron: sensoryNeuron,
                transmission: transmission ? `${transmission.preNeuronId} ──[${transmission.type}]──► ${transmission.postNeuronId}` : `${sensoryNeuron} ──► ${firedInter}`,
                interNeuron: firedInter,
                motorNeuron: motorNeuron,
                action: actionName
            });

            if (this.causalTraceLog.length > 20) this.causalTraceLog.pop();
        }

        return {
            speed_throttle: Math.max(0.1, throttle),
            steering_bias: turn,
            spikes_fired: firedThisStep.length,
            actionName: actionName
        };
    }
}

// ====================================================================
// 1. PHEROMONE STIGMERGY ENGINE (COLONY DISTRIBUTED MEMORY)
// ====================================================================
class PheromoneField {
    constructor(minX = -4.0, maxX = 6.0, minY = -4.0, maxY = 4.0, res = 0.25) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        this.res = res;
        this.cols = Math.ceil((maxX - minX) / res);
        this.rows = Math.ceil((maxY - minY) / res);
        this.grid = new Array(this.cols * this.rows);

        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = { FOOD: 0.0, HOME: 0.0, RECRUITMENT: 0.0, DANGER: 0.0, EXPLORE: 0.0, TASK: 0.0 };
        }

        this.decayRates = {
            FOOD: 0.015,
            HOME: 0.010,
            RECRUITMENT: 0.035,
            DANGER: 0.050,
            EXPLORE: 0.025,
            TASK: 0.020
        };
    }

    _getIndex(x, y) {
        if (x < this.minX || x >= this.maxX || y < this.minY || y >= this.maxY) return -1;
        const c = Math.floor((x - this.minX) / this.res);
        const r = Math.floor((y - this.minY) / this.res);
        return r * this.cols + c;
    }

    deposit(x, y, channel, amount = 1.0) {
        const idx = this._getIndex(x, y);
        if (idx >= 0 && this.grid[idx]) {
            this.grid[idx][channel] = Math.min(10.0, (this.grid[idx][channel] || 0.0) + amount);
        }
    }

    decay() {
        for (let i = 0; i < this.grid.length; i++) {
            const cell = this.grid[i];
            cell.FOOD *= (1.0 - this.decayRates.FOOD);
            cell.HOME *= (1.0 - this.decayRates.HOME);
            cell.RECRUITMENT *= (1.0 - this.decayRates.RECRUITMENT);
            cell.DANGER *= (1.0 - this.decayRates.DANGER);
            cell.EXPLORE *= (1.0 - this.decayRates.EXPLORE);
            cell.TASK *= (1.0 - this.decayRates.TASK);
        }
    }

    sense(x, y, channel, radius = 1.5) {
        let conc = 0.0;
        let gradX = 0.0;
        let gradY = 0.0;

        const centerC = Math.floor((x - this.minX) / this.res);
        const centerR = Math.floor((y - this.minY) / this.res);
        const cellRadius = Math.ceil(radius / this.res);

        for (let dr = -cellRadius; dr <= cellRadius; dr++) {
            for (let dc = -cellRadius; dc <= cellRadius; dc++) {
                const c = centerC + dc;
                const r = centerR + dr;
                if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
                    const idx = r * this.cols + c;
                    const val = this.grid[idx][channel] || 0.0;
                    if (val > 0.01) {
                        const cellX = this.minX + (c + 0.5) * this.res;
                        const cellY = this.minY + (r + 0.5) * this.res;
                        const dx = cellX - x;
                        const dy = cellY - y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= radius * radius) {
                            conc += val;
                            const weight = val / (Math.sqrt(distSq) + 0.1);
                            gradX += dx * weight;
                            gradY += dy * weight;
                        }
                    }
                }
            }
        }

        return { concentration: conc, gradX, gradY };
    }

    getActiveTrailCount() {
        let count = 0;
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i].FOOD > 0.1 || this.grid[i].RECRUITMENT > 0.1) count++;
        }
        return count;
    }
}

const pheromoneField = new PheromoneField();

// ====================================================================
// 2. COLONY LOCAL COMMUNICATION BUS (RANGE-FILTERED & EXPIRING MESSAGES)
// ====================================================================
class ColonyCommunicationChannel {
    constructor() {
        this.messages = [];
        this.maxCommRange = 3.0; // Max spatial range for message delivery (3.0 meters)
        this.processedMsgCount = 0;
        this.recentMessageRate = 0;
        this.msgCounter = 0;
    }

    broadcast({ senderId, receiverId = "BROADCAST", type, payload = {}, location = { x: 0, y: 0 }, ttl = 30, priority = 1.0 }) {
        this.msgCounter++;
        const msg = {
            id: `MSG_${Date.now()}_${this.msgCounter}`,
            senderId,
            receiverId,
            type,
            payload,
            location: { x: location.x, y: location.y },
            timestamp: performance.now(),
            ttl: ttl,
            priority: priority
        };
        this.messages.push(msg);
        this.processedMsgCount++;
        this.recentMessageRate++;
        return msg;
    }

    step() {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            this.messages[i].ttl--;
            if (this.messages[i].ttl <= 0) {
                this.messages.splice(i, 1);
            }
        }
    }

    getNearbyMessages(antX, antY, radius = 3.0) {
        return this.messages.filter(msg => {
            const dist = Math.sqrt((msg.location.x - antX) ** 2 + (msg.location.y - antY) ** 2);
            return dist <= radius;
        });
    }

    getActiveRecruitmentRequests() {
        return this.messages.filter(m => m.type === "RECRUIT_REQUEST");
    }
}

const colonyCommBus = new ColonyCommunicationChannel();

// ====================================================================
// 3. DECENTRALIZED ROLE & COLONY DEMAND ENGINE
// ====================================================================
class ColonyDemandState {
    constructor() {
        this.foodNeed = 0.6;
        this.nestNeed = 0.2;
        this.defenseNeed = 0.1;
        this.explorationNeed = 0.4;
        this.workerNeed = 0.5;
        this.repairNeed = 0.1;
    }

    updateNeedsFromWorld(activeTasks, activeAnts) {
        const pendingTasks = activeTasks.filter(t => t.status === 'PENDING' || t.status === 'VISIBLE').length;
        const totalAnts = Math.max(1, activeAnts.length);

        this.foodNeed = Math.min(1.0, 0.3 + (pendingTasks / Math.max(1, totalAnts)) * 0.4);
        const dangerCount = colonyCommBus.messages.filter(m => m.type === 'DANGER').length;
        this.defenseNeed = dangerCount > 0 ? 0.9 : 0.1;
        const recruitCount = colonyCommBus.getActiveRecruitmentRequests().length;
        this.workerNeed = Math.min(1.0, recruitCount * 0.3 + 0.3);
    }
}

const colonyDemand = new ColonyDemandState();

// ====================================================================
// 4. CONTRIBUTION TRACKER & FAIR CREDIT ASSIGNMENT
// ====================================================================
class TaskContributionTracker {
    constructor(taskId) {
        this.taskId = taskId;
        this.participants = {};
    }

    recordContribution(antId, deltaDist, actionType) {
        if (!this.participants[antId]) {
            this.participants[antId] = { joinTime: performance.now(), distanceMoved: 0, actions: 0, totalEffort: 0 };
        }
        const p = this.participants[antId];
        p.distanceMoved += Math.max(0, deltaDist);
        p.actions++;
        p.totalEffort += 1.0 + Math.max(0, deltaDist) * 2.0;
    }

    getRewardFractions() {
        let totalEffort = 0;
        Object.values(this.participants).forEach(p => { totalEffort += p.totalEffort; });
        if (totalEffort <= 0) return {};

        const fractions = {};
        Object.keys(this.participants).forEach(antId => {
            fractions[antId] = this.participants[antId].totalEffort / totalEffort;
        });
        return fractions;
    }
}

const activeTaskTrackers = {};

// --- SIMULATION ANT AGENT & CELEBRATION TRACKER ---
const celebratedCompletions = new Set();

class SimAntAgent {
    constructor(id, colorHex) {
        this.id = id;
        this.colorHex = colorHex;
        this.x = 1.0;
        this.y = -0.8;
        this.prevX = 1.0;
        this.prevY = -0.8;
        this.stuckStepCount = 0;
        this.oscillationCount = 0;
        this.theta = Math.PI / 2;
        this.targetKey = null;
        this.targetX = null;
        this.targetY = null;
        this.claimedTask = null;
        this.navigationState = "SEARCHING";
        this.status = "SEARCHING";
        this.stepCount = 0;
        this.totalReward = 0.0;
        this.lastReward = 0.0;
        this.lastDistance = Infinity;
        this.distanceDelta = 0;
        this.isBlocked = false;
        this.isOscillating = false;
        this.rewardIssuedForTasks = new Set();
        this.rewardState = new PerAntRewardState(this.id);
        this.trajectory = [{ x: this.x, y: this.y }];
        this.brain = null;

        // --- DECENTRALIZED ADAPTIVE COLONY EXTENSIONS ---
        this.role = "FORAGER"; // FORAGER, EXPLORER, TRANSPORTER, BUILDER, NURSE, DEFENDER, RECRUITER, SCOUT, SUPPORT
        this.roleMotivation = "Default initial foraging preference";
        this.memory = {
            visitedLocations: [],
            successfulRoutes: [],
            recentTaskFailures: 0
        };
        this.learnedValues = {
            FORAGE: 1.0,
            TRANSPORT: 1.2,
            BUILD: 0.8,
            EXPLORE: 0.9,
            DEFEND: 1.5,
            RECRUIT: 1.1
        };
        this.coActionSubRole = "NONE"; // NONE, ANCHOR, PULLER, PUSHER, SUPPORT, NAVIGATOR
        this.coActionState = "NONE"; // NONE, ALIGN, FORM, SYNC, ACT, VERIFY
        this.topEvaluatedUtilities = [];
        this.lastDecisionReason = "Initial state scan";
        this.sensorRadius = 2.5; // Local perception range (meters)
    }

    reset(startX, startY, manifest, neurons, synapses) {
        this.x = startX;
        this.y = startY;
        this.prevX = startX;
        this.prevY = startY;
        this.stuckStepCount = 0;
        this.oscillationCount = 0;
        this.theta = Math.PI / 2;
        this.stepCount = 0;
        this.totalReward = 0.0;
        this.lastReward = 0.0;
        this.targetKey = null;
        this.targetX = null;
        this.targetY = null;
        this.navigationState = "SEARCHING";
        this.status = "SEARCHING";
        this.claimedTask = null;
        this.lastDistance = Infinity;
        this.distanceDelta = 0;
        this.isBlocked = false;
        this.isOscillating = false;
        this.rewardIssuedForTasks = new Set();
        this.rewardState = new PerAntRewardState(this.id);
        this.trajectory = [{ x: this.x, y: this.y }];
        this.brain = new JSAntBrain(this.id, manifest, neurons, synapses);

        this.role = (this.id % 2 === 1) ? "FORAGER" : "EXPLORER";
        this.roleMotivation = "Initial colony distribution";
        this.coActionSubRole = "NONE";
        this.coActionState = "NONE";
        this.topEvaluatedUtilities = [];
        this.lastDecisionReason = "Colony reset complete";
    }

    evaluateRole() {
        const foodPhero = pheromoneField.sense(this.x, this.y, 'FOOD', 1.5).concentration;
        const recruitReqs = colonyCommBus.getNearbyMessages(this.x, this.y, this.sensorRadius).filter(m => m.type === 'RECRUIT_REQUEST');

        let scores = {
            FORAGER: colonyDemand.foodNeed * 2.0 + foodPhero * 0.5,
            EXPLORER: colonyDemand.explorationNeed * 1.5 + (1.0 / (foodPhero + 0.1)) * 0.3,
            SUPPORT: recruitReqs.length > 0 ? 3.0 : 0.2,
            DEFENDER: colonyDemand.defenseNeed * 4.0,
            BUILDER: colonyDemand.nestNeed * 2.0
        };

        let bestRole = "FORAGER";
        let bestScore = -Infinity;
        Object.keys(scores).forEach(r => {
            if (scores[r] > bestScore) {
                bestScore = scores[r];
                bestRole = r;
            }
        });

        if (this.role !== bestRole) {
            this.role = bestRole;
            this.roleMotivation = `Shifted role to ${bestRole} (score: ${bestScore.toFixed(2)}) based on local perception`;
        }
    }

    evaluateTaskUtility(task, layout) {
        const targetPos = layout[task.target] || layout[`A_${task.target}`] || layout[`B_${task.target}`] || { x: 1.0, y: 0.0 };
        const dist = Math.sqrt((targetPos.x - this.x) ** 2 + (targetPos.y - this.y) ** 2);

        // Utility formula components
        const priority = task.priority || 1.0;
        const learnedVal = this.learnedValues[task.type || 'FORAGE'] || 1.0;
        const pheroSense = pheromoneField.sense(targetPos.x, targetPos.y, 'FOOD', 1.0).concentration;
        const colonyNeedVal = colonyDemand.foodNeed * 2.0;
        const proximityScore = 3.0 / (dist + 0.5);
        const roleFit = (this.role === 'FORAGER' || this.role === 'TRANSPORTER') ? 2.0 : (this.role === 'SUPPORT' ? 1.5 : 0.8);
        
        // Recruitment & Help bonus
        const recruitMsgs = colonyCommBus.getNearbyMessages(this.x, this.y, this.sensorRadius).filter(m => m.type === 'RECRUIT_REQUEST' && m.payload.taskId === task.id);
        const recruitmentSignal = recruitMsgs.length > 0 ? 3.5 : 0.0;

        // Costs
        const travelCost = dist * 0.6;
        const claimedCount = task.claimedAgents ? task.claimedAgents.length : (task.claimedBy ? 1 : 0);
        const requiredCount = task.requiredAgents || 1;
        const congestionCost = (claimedCount >= requiredCount && task.claimedBy !== this.id) ? 4.0 : 0.0;
        const failureRisk = (this.memory.recentTaskFailures || 0) * 0.4;

        const netUtility = priority + learnedVal + (pheroSense * 0.5) + colonyNeedVal + proximityScore + roleFit + recruitmentSignal - travelCost - congestionCost - failureRisk;

        return {
            taskId: task.id,
            target: task.target,
            netUtility: netUtility,
            breakdown: {
                dist: dist.toFixed(2),
                phero: pheroSense.toFixed(2),
                roleFit: roleFit.toFixed(1),
                congest: congestionCost.toFixed(1)
            }
        };
    }

    evaluateLocalTasks() {
        this.evaluateRole();

        const layout = (simState.mode === 'PARALLEL') ? KEYS_KBD_A : KEYS_SINGLE;
        let allowedTasks = commTasks.filter(t => t.status === 'PENDING' || t.status === 'VISIBLE' || t.claimedBy === this.id);

        if (simState.orderingMode === 'ORDERED' && simState.targetMode === 'SEQUENCE') {
            const uncompletedOrders = commTasks.filter(t => t.status !== 'COMPLETED').map(t => t.order || 1);
            const unlockedOrder = uncompletedOrders.length > 0 ? Math.min(...uncompletedOrders) : 999;
            allowedTasks = allowedTasks.filter(t => (t.order || 1) === unlockedOrder);
        }

        if (allowedTasks.length === 0) {
            this.topEvaluatedUtilities = [];
            this.lastDecisionReason = "No eligible tasks in current sequence order";
            return null;
        }

        const utilityList = allowedTasks.map(t => ({
            task: t,
            util: this.evaluateTaskUtility(t, layout)
        }));

        utilityList.sort((a, b) => b.util.netUtility - a.util.netUtility);
        this.topEvaluatedUtilities = utilityList.slice(0, 3).map(u => ({
            taskId: u.task.id,
            target: u.task.target,
            utility: u.util.netUtility,
            breakdown: u.util.breakdown
        }));

        const best = utilityList[0];
        if (best && best.util.netUtility > 0) {
            const selected = best.task;
            if (selected.status === 'PENDING' || selected.status === 'VISIBLE') {
                selected.status = 'CLAIMED';
                selected.claimedBy = this.id;
                if (!selected.claimedAgents) selected.claimedAgents = [];
                if (!selected.claimedAgents.includes(this.id)) selected.claimedAgents.push(this.id);
                selected.lastActivity = Date.now();
            }
            this.lastDecisionReason = `Selected task #${selected.order} [${selected.target}] via local utility evaluation (+${best.util.netUtility.toFixed(2)})`;
            return selected;
        }

        this.lastDecisionReason = "Local utility evaluation score below threshold; exploring";
        return null;
    }

    clearTarget() {
        if (this.claimedTask && this.claimedTask.status !== "COMPLETED") {
            this.claimedTask.status = "PENDING";
            this.claimedTask.claimedBy = null;
            if (this.claimedTask.claimedAgents) {
                const idx = this.claimedTask.claimedAgents.indexOf(this.id);
                if (idx !== -1) this.claimedTask.claimedAgents.splice(idx, 1);
            }
        }
        this.claimedTask = null;
        this.targetKey = null;
        this.targetX = null;
        this.targetY = null;
        this.navigationState = "IDLE";
        this.status = "IDLE";
        this.coActionSubRole = "NONE";
        this.coActionState = "NONE";
    }
}

let activeAnts = [];
let commTasks = [];

// --- THREE.JS SIMULATION SCENE ---
let scene, camera, renderer, controls;
let padGroupA, padGroupB;
let antMeshes = [], antLegsList = [];
let trajectoryLines = [], trajectoryGeometries = [];
let signalMeshGroup;

function init3DSimulation() {
    const container = document.getElementById('canvas-3d');
    if (!container) return;
    const width = container.clientWidth || (window.innerWidth / 2);
    const height = container.clientHeight || (window.innerHeight - 60);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);
    scene.fog = new THREE.FogExp2(0x0a0d14, 0.08);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(1.0, 4.5, 4.5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(1.0, 0.3, 0.5);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.0);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(16, 32, 0x00f2fe, 0x1f2937);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    signalMeshGroup = new THREE.Group();
    scene.add(signalMeshGroup);
}

function rebuildKeyboards3D() {
    if (padGroupA) scene.remove(padGroupA);
    if (padGroupB) scene.remove(padGroupB);

    padGroupA = new THREE.Group();
    padGroupB = new THREE.Group();

    if (simState.mode === "PARALLEL") {
        createKeyboardPadMesh(KEYS_KBD_A, padGroupA, "KEYBOARD A");
        createKeyboardPadMesh(KEYS_KBD_B, padGroupB, "KEYBOARD B");
        scene.add(padGroupA);
        scene.add(padGroupB);
    } else {
        createKeyboardPadMesh(KEYS_SINGLE, padGroupA, "KEYBOARD");
        scene.add(padGroupA);
    }
}

function createKeyboardPadMesh(layout, group, labelText) {
    Object.keys(layout).forEach(k => {
        const item = layout[k];
        const labelStr = item.label || k;
        const geo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.6, emissive: 0x0f172a });

        const keyMesh = new THREE.Mesh(geo, mat);
        keyMesh.position.set(item.x, 0.075, -item.y);
        keyMesh.castShadow = true;
        keyMesh.receiveShadow = true;

        const wireGeo = new THREE.EdgesGeometry(geo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x334155 });
        keyMesh.add(new THREE.LineSegments(wireGeo, wireMat));

        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#00f2fe'; ctx.font = 'bold 72px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(labelStr, 64, 64);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        const labelGeo = new THREE.PlaneGeometry(0.6, 0.6);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.y = 0.081;
        keyMesh.add(labelMesh);

        group.add(keyMesh);
    });
}

function rebuildAnts3D() {
    antMeshes.forEach(m => scene.remove(m));
    trajectoryLines.forEach(l => scene.remove(l));
    antMeshes = [];
    antLegsList = [];
    trajectoryLines = [];
    trajectoryGeometries = [];

    activeAnts.forEach((ant, idx) => {
        const group = new THREE.Group();
        const hexColor = ANT_COLORS[idx % ANT_COLORS.length];
        const antMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.2, metalness: 0.8 });

        const abd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), antMat);
        abd.scale.set(1.0, 0.8, 1.4); abd.position.set(0, 0.08, -0.16); group.add(abd);

        const thx = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), antMat);
        thx.scale.set(0.8, 0.8, 1.0); thx.position.set(0, 0.08, 0); group.add(thx);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), antMat);
        head.scale.set(1.0, 0.8, 0.9); head.position.set(0, 0.08, 0.14); group.add(head);

        const legs = [];
        for (let i = 0; i < 6; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const row = Math.floor(i / 2);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2), antMat);
            leg.position.set(side * 0.12, 0.04, (row - 1) * 0.08);
            leg.rotation.z = side * Math.PI / 4;
            group.add(leg);
            legs.push(leg);
        }

        scene.add(group);
        antMeshes.push(group);
        antLegsList.push(legs);

        const geom = new THREE.BufferGeometry();
        const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: hexColor, linewidth: 2 }));
        scene.add(line);
        trajectoryGeometries.push(geom);
        trajectoryLines.push(line);
    });
}

// --- DETERMINISTIC 3D ANATOMICAL NEUROPIL EMBEDDING ---
function computeStructuredBrainPositions(neurons) {
    const posMap = {};

    neurons.forEach((n, idx) => {
        const reg = n.region || 'DEFAULT';
        let x = 0, y = 0, z = 0;
        const isLeft = idx % 2 === 0;
        const sideSign = isLeft ? -1 : 1;

        if (reg === 'ANTENNAL_LOBE') {
            const angle = (idx * 0.8);
            const r = 0.35;
            x = sideSign * 1.3 + Math.cos(angle) * r * 0.5;
            y = 0.0 + Math.sin(angle) * r * 0.5;
            z = 1.2 + (idx * 0.02);
        } else if (reg.startsWith('MUSHROOM_BODY_CALYX')) {
            const phi = (idx * 0.5);
            x = sideSign * 1.5 + Math.cos(phi) * 0.4;
            y = 1.1 + Math.sin(phi) * 0.3;
            z = -0.5 + (idx * 0.01);
        } else if (reg.startsWith('MUSHROOM_BODY_PEDUNCLE')) {
            x = sideSign * (0.8 + (idx % 4) * 0.1);
            y = 0.6 - (idx % 8) * 0.08;
            z = -0.1 + (idx % 6) * 0.08;
        } else if (reg.startsWith('MUSHROOM_BODY_LOBES')) {
            x = sideSign * 0.4 + (idx % 3) * 0.1;
            y = 0.2 + (idx % 5) * 0.08;
            z = 0.4 + (idx % 4) * 0.05;
        } else if (reg === 'CENTRAL_COMPLEX_EB') {
            const wedge = (idx % 16);
            const theta = (wedge * Math.PI * 2) / 16;
            const radius = 0.55;
            x = Math.cos(theta) * radius;
            y = 0.4 + Math.sin(theta) * radius * 0.5;
            z = 0.2;
        } else if (reg === 'CENTRAL_COMPLEX_PB') {
            x = (idx % 16 - 8) * 0.12;
            y = 0.85;
            z = -0.4;
        } else if (reg === 'SUBESOPHAGEAL_ZONE') {
            x = sideSign * 0.4;
            y = -0.6 - (idx % 4) * 0.1;
            z = 0.2 + (idx % 4) * 0.05;
        } else if (reg === 'VENTRAL_NERVE_CORD') {
            const ganglionIndex = Math.floor(idx / 8) % 3;
            x = sideSign * 0.3;
            y = -1.2 - ganglionIndex * 0.4;
            z = -0.8 - ganglionIndex * 0.5;
        } else {
            const phi = Math.acos(-1 + (2 * idx) / neurons.length);
            const theta = Math.sqrt(neurons.length * Math.PI) * phi;
            x = Math.cos(theta) * Math.sin(phi) * 1.2;
            y = Math.sin(theta) * Math.sin(phi) * 0.8;
            z = Math.cos(phi) * 1.0;
        }

        posMap[n.id] = new THREE.Vector3(x, y, z);
    });

    return posMap;
}

// --- THREE.JS NEURAL MAP & MORPHOLOGICAL LOD RENDERER ---
let brainScene, brainCamera, brainRenderer, brainControls;
let neuronMeshes = [];
let synapseLines = [];
let synapseArrowMeshes = [];
let signalPulseMeshes = [];
let neuropilHullMeshes = [];
let brainBounds = { center: new THREE.Vector3(0, 0, 0), radius: 5 };

function init3DBrain() {
    const container = document.getElementById('canvas-brain-3d');
    if (!container) return;
    const width = container.clientWidth || (window.innerWidth / 2);
    const height = container.clientHeight || (window.innerHeight - 60);

    brainScene = new THREE.Scene();
    brainScene.background = new THREE.Color(0x060911);

    brainCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    brainCamera.position.set(0, 0, 8);

    brainRenderer = new THREE.WebGLRenderer({ antialias: true });
    brainRenderer.setSize(width, height);
    brainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    container.innerHTML = '';
    container.appendChild(brainRenderer.domElement);

    brainControls = new THREE.OrbitControls(brainCamera, brainRenderer.domElement);
    brainControls.enableDamping = true;
    brainControls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    brainScene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f2fe, 1.5, 50);
    pointLight.position.set(0, 10, 10);
    brainScene.add(pointLight);

    // Raycaster for 3D neurons & synapses
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    brainRenderer.domElement.addEventListener('click', (event) => {
        const rect = brainRenderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, brainCamera);
        const visibleMeshes = neuronMeshes.filter(m => m.visible);
        const intersects = raycaster.intersectObjects(visibleMeshes, true);

        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            while (hitObj.parent && hitObj.parent !== brainScene && !hitObj.userData.id) {
                hitObj = hitObj.parent;
            }
            if (hitObj.userData.id) {
                selectedNeuronId = hitObj.userData.id;
                selectedSynapseId = null;
                focusNeuron(selectedNeuronId);
                updateNeuronInspector(selectedNeuronId);
            }
        }
    });

    brainRenderer.domElement.addEventListener('wheel', (e) => {
        e.stopPropagation();
    }, { passive: true });

    // Subscribe Renderer to Real NeuralEventBus
    neuralBus.subscribe((event) => {
        if (simState.signalPlaybackMode === 'PAUSE') return;

        if (event.eventType === "SYNAPSE_TRANSMISSION") {
            const pkt = {
                id: `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                antId: event.antId,
                synapseId: event.synapseId,
                preId: event.preNeuronId,
                postId: event.postNeuronId,
                weight: event.weight,
                delay: event.delay,
                type: event.type,
                timestamp: event.timestamp,
                progress: 0.0,
                speed: 0.012 // Human-visible smooth travel time (~1.5s duration)
            };
            activeSignalPackets.push(pkt);
            activeInspectorSignal = pkt;
        }
    });
}

function calculateBrainBoundsFromPosMap(posMap) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    Object.values(posMap).forEach(pos => {
        minX = Math.min(minX, pos.x); maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y); maxY = Math.max(maxY, pos.y);
        minZ = Math.min(minZ, pos.z); maxZ = Math.max(maxZ, pos.z);
    });

    const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1.0) / 2;

    return { center, radius };
}

function fitToBrain() {
    if (!brainCamera || !brainControls) return;
    const center = brainBounds.center;
    const radius = Math.max(brainBounds.radius, 0.8);

    const fov = brainCamera.fov * (Math.PI / 180);
    let distance = (radius / Math.sin(fov / 2)) * 1.5;
    if (isNaN(distance) || distance < 1.5) distance = 4.5;

    brainCamera.position.set(center.x, center.y, center.z + distance);
    brainControls.target.copy(center);
    brainCamera.lookAt(center);
    brainControls.update();
}

function focusNeuron(neuronId) {
    if (!brainCamera || !brainControls || !brainPackage) return;
    const mesh = neuronMeshes.find(m => m.userData.id === neuronId);
    if (mesh) {
        const targetPos = mesh.position.clone();
        brainControls.target.copy(targetPos);
        brainCamera.position.set(targetPos.x, targetPos.y + 0.3, targetPos.z + 1.2);
        brainControls.update();
    }
}

function focusSynapse(preId, postId) {
    const sLine = synapseLines.find(l => l.userData.pre === preId && l.userData.post === postId);
    if (sLine) {
        selectedNeuronId = preId;
        selectedSynapseId = sLine.userData.data?.synapse_id || `${preId}->${postId}`;
        focusNeuron(preId);
        updateNeuronInspector(preId);
    }
}

function resetCamera() {
    fitToBrain();
}

function createMorphologicalNeuronMesh(data, hexColor) {
    const group = new THREE.Group();

    const somaGeo = new THREE.SphereGeometry(0.045, 14, 14);
    const somaMat = new THREE.MeshStandardMaterial({
        color: hexColor,
        emissive: hexColor,
        emissiveIntensity: 0.25,
        roughness: 0.3
    });
    const somaMesh = new THREE.Mesh(somaGeo, somaMat);
    group.add(somaMesh);

    const stemGeo = new THREE.CylinderGeometry(0.008, 0.005, 0.12, 8);
    const stemMat = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.6 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.set(0, -0.07, 0);
    group.add(stemMesh);

    const dendriteMat = new THREE.LineBasicMaterial({ color: hexColor, transparent: true, opacity: 0.4 });
    for (let b = 0; b < 3; b++) {
        const angle = (b * Math.PI * 2) / 3;
        const pts = [
            new THREE.Vector3(0, 0.02, 0),
            new THREE.Vector3(Math.cos(angle) * 0.08, 0.06 + (b * 0.01), Math.sin(angle) * 0.08)
        ];
        const dendGeo = new THREE.BufferGeometry().setFromPoints(pts);
        group.add(new THREE.Line(dendGeo, dendriteMat));
    }

    return group;
}

function createNeuropilBoundaryHulls(brainScene) {
    const hulls = [
        { name: "Antennal Lobe Left (AL_L)", center: [-1.3, 0.0, 1.3], size: [0.9, 0.9, 0.9], color: 0x00e676 },
        { name: "Antennal Lobe Right (AL_R)", center: [1.3, 0.0, 1.3], size: [0.9, 0.9, 0.9], color: 0x00e676 },
        { name: "Mushroom Body Calyces (MB)", center: [0.0, 1.2, -0.5], size: [3.2, 0.8, 0.8], color: 0x00f2fe },
        { name: "Central Complex Ring (CX-EB)", center: [0.0, 0.4, 0.2], size: [1.4, 1.2, 0.4], color: 0x9d4edd },
        { name: "Subesophageal Zone (SEZ)", center: [0.0, -0.6, 0.2], size: [1.2, 0.8, 0.8], color: 0xffaa00 },
        { name: "Ventral Nerve Cord (VNC)", center: [0.0, -1.6, -1.2], size: [1.0, 1.4, 1.8], color: 0xff3d71 }
    ];

    hulls.forEach(h => {
        const geo = new THREE.BoxGeometry(h.size[0], h.size[1], h.size[2]);
        const mat = new THREE.MeshStandardMaterial({
            color: h.color,
            transparent: true,
            opacity: 0.06,
            roughness: 0.2,
            wireframe: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(h.center[0], h.center[1], h.center[2]);

        const wireGeo = new THREE.EdgesGeometry(geo);
        const wireMat = new THREE.LineBasicMaterial({ color: h.color, transparent: true, opacity: 0.18 });
        mesh.add(new THREE.LineSegments(wireGeo, wireMat));

        brainScene.add(mesh);
        neuropilHullMeshes.push(mesh);
    });
}

let parsed55kNeurons = [];
let valid55kCoordsCount = 55000;
let invalid55kCoordsCount = 0;
let visible55kCount = 55000;
let active55kLayer = 'ALL';
let instanced55kMesh = null;
let sliceBounds = { xMin: -100, xMax: 100, yMin: -100, yMax: 100, zMin: -100, zMax: 100 };
let neuronRenderScale = 1.0;

function build55KModeledNeuronDataset(archetypeNeurons) {
    const parsed = [];
    const count = archetypeNeurons.length || 128;
    const TOTAL_55K = 55000;
    const NUM_LAYERS = 8;
    const PER_LAYER = Math.ceil(TOTAL_55K / NUM_LAYERS);

    const posBaseMap = computeStructuredBrainPositions(archetypeNeurons);

    for (let i = 0; i < TOTAL_55K; i++) {
        const arch = archetypeNeurons[i % count] || { id: 'NEURON_0000', region: 'DEFAULT' };
        const layer = Math.min(NUM_LAYERS, Math.floor(i / PER_LAYER) + 1);
        const base = posBaseMap[arch.id] || new THREE.Vector3(0, 0, 0);

        const seed = i * 1.61803398875;
        const offsetX = (Math.sin(seed * 1.1) * 0.28) + (Math.cos(seed * 2.3) * 0.14);
        const offsetY = (Math.cos(seed * 1.7) * 0.22) + (Math.sin(seed * 3.1) * 0.12);
        const offsetZ = ((layer - 4.5) * 0.35) + (Math.sin(seed * 2.7) * 0.15);

        const x = base.x + offsetX;
        const y = base.y + offsetY;
        const z = base.z + offsetZ;
        const isValid = isFinite(x) && isFinite(y) && isFinite(z);

        parsed.push({
            id: `NEURON_${String(i).padStart(5, '0')}`,
            archetypeId: arch.id,
            layer: layer,
            index: i,
            region: arch.region || 'DEFAULT',
            subregion: arch.subregion || arch.region || 'DEFAULT',
            cell_type: arch.cell_type || 'MODELLED',
            neurotransmitter: arch.neurotransmitter || 'GABA',
            resting_potential: arch.resting_potential || -65,
            threshold: arch.threshold || -45,
            position_3d: new THREE.Vector3(x, y, z),
            isValid: isValid
        });
    }

    valid55kCoordsCount = parsed.filter(n => n.isValid).length;
    invalid55kCoordsCount = parsed.length - valid55kCoordsCount;
    return parsed;
}

function rebuild55KInstancedMesh() {
    if (!brainScene || parsed55kNeurons.length === 0) return;

    if (instanced55kMesh) {
        brainScene.remove(instanced55kMesh);
        if (instanced55kMesh.geometry) instanced55kMesh.geometry.dispose();
        if (instanced55kMesh.material) instanced55kMesh.material.dispose();
        instanced55kMesh = null;
    }

    const geo = new THREE.SphereGeometry(0.025, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.2
    });

    instanced55kMesh = new THREE.InstancedMesh(geo, mat, parsed55kNeurons.length);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let visibleCount = 0;

    parsed55kNeurons.forEach((n, idx) => {
        const pos = n.position_3d;
        const isLayerVisible = (active55kLayer === 'ALL' || n.layer === parseInt(active55kLayer));
        const isRegionVisible = (simState.selectedRegion === 'ALL' || n.region === simState.selectedRegion);

        const isXSlice = (pos.x >= sliceBounds.xMin * 0.05 && pos.x <= sliceBounds.xMax * 0.05);
        const isYSlice = (pos.y >= sliceBounds.yMin * 0.05 && pos.y <= sliceBounds.yMax * 0.05);
        const isZSlice = (pos.z >= sliceBounds.zMin * 0.05 && pos.z <= sliceBounds.zMax * 0.05);

        const isVisible = isLayerVisible && isRegionVisible && isXSlice && isYSlice && isZSlice && n.isValid;

        if (isVisible) {
            dummy.position.copy(pos);
            dummy.scale.setScalar(neuronRenderScale);
            dummy.updateMatrix();
            instanced55kMesh.setMatrixAt(idx, dummy.matrix);

            const hexColor = REGION_COLORS[n.region] || REGION_COLORS['DEFAULT'];
            color.setHex(hexColor);
            instanced55kMesh.setColorAt(idx, color);
            visibleCount++;
        } else {
            dummy.position.copy(pos);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            instanced55kMesh.setMatrixAt(idx, dummy.matrix);
        }
    });

    instanced55kMesh.instanceMatrix.needsUpdate = true;
    if (instanced55kMesh.instanceColor) instanced55kMesh.instanceColor.needsUpdate = true;

    brainScene.add(instanced55kMesh);
    visible55kCount = visibleCount;

    const elStatus = document.getElementById('layer-status-text');
    if (elStatus) {
        if (active55kLayer === 'ALL') {
            elStatus.textContent = `ALL 8 LAYERS — 55,000 Modeled Neurons (Visible: ${visibleCount.toLocaleString()})`;
        } else {
            elStatus.textContent = `Layer ${active55kLayer} / 8 — ~6,875 Neurons (Visible: ${visibleCount.toLocaleString()})`;
        }
    }
}

function focus55KNeuron(neuron) {
    if (!brainCamera || !brainControls || !neuron) return;
    const targetPos = neuron.position_3d.clone();
    brainControls.target.copy(targetPos);
    brainCamera.position.set(targetPos.x, targetPos.y + 0.2, targetPos.z + 0.8);
    brainControls.update();
}

function update55KNeuronInspector(neuron) {
    if (!neuron) return;

    const inspId = document.getElementById('insp-id');
    const inspType = document.getElementById('insp-type');
    const inspRegion = document.getElementById('insp-region');
    const inspMorph = document.getElementById('insp-morph');
    const inspMem = document.getElementById('insp-membrane');
    const inspState = document.getElementById('insp-state');
    const inspConn = document.getElementById('insp-conn');
    const inspPos = document.getElementById('insp-pos');
    const inspLayer = document.getElementById('insp-layer');

    const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
    const antBrain = selectedAnt ? selectedAnt.brain : null;

    if (inspId) inspId.textContent = neuron.id;
    if (inspType) inspType.textContent = `${neuron.cell_type || 'MODELLED'} (${neuron.neurotransmitter || 'GABA'})`;
    if (inspRegion) inspRegion.textContent = neuron.region || 'CENTRAL';
    if (inspMorph) inspMorph.textContent = "55K MODELED NEURON ANT BRAIN";
    if (inspLayer) inspLayer.textContent = `Layer ${neuron.layer} / 8`;
    if (inspPos) inspPos.textContent = `X: ${neuron.position_3d.x.toFixed(2)}, Y: ${neuron.position_3d.y.toFixed(2)}, Z: ${neuron.position_3d.z.toFixed(2)}`;

    if (antBrain) {
        const pot = antBrain.neuronStates[neuron.archetypeId] || neuron.resting_potential || -65.0;
        const isSpike = antBrain.spikes[neuron.archetypeId] || false;
        if (inspMem) inspMem.textContent = `${pot.toFixed(2)} mV`;
        if (inspState) {
            inspState.textContent = isSpike ? "FIRING SPIKE" : "Resting/Depolarizing";
            inspState.className = isSpike ? "text-amber" : "text-cyan";
        }
    }

    if (inspConn && brainPackage && brainPackage.synapses) {
        const inConn = brainPackage.synapses.filter(s => s.post_neuron_id === neuron.archetypeId).length;
        const outConn = brainPackage.synapses.filter(s => s.pre_neuron_id === neuron.archetypeId).length;
        inspConn.textContent = `In: ${inConn} | Out: ${outConn}`;
    }
}

function fitLayer(layerId) {
    if (!brainCamera || !brainControls || parsed55kNeurons.length === 0) return;
    const targetLayer = layerId !== undefined ? layerId : (active55kLayer === 'ALL' ? 1 : parseInt(active55kLayer));
    const layerNeurons = parsed55kNeurons.filter(n => n.layer === targetLayer && n.isValid);

    if (layerNeurons.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    layerNeurons.forEach(n => {
        const p = n.position_3d;
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    });

    const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1.0) / 2;

    const fov = brainCamera.fov * (Math.PI / 180);
    let distance = (radius / Math.sin(fov / 2)) * 1.5;
    if (isNaN(distance) || distance < 1.5) distance = 3.5;

    brainCamera.position.set(center.x, center.y, center.z + distance);
    brainControls.target.copy(center);
    brainControls.update();
}

function rebuildBrain3D() {
    if (!brainScene || !brainPackage) return;

    neuronMeshes.forEach(m => brainScene.remove(m));
    synapseLines.forEach(l => brainScene.remove(l));
    synapseArrowMeshes.forEach(a => brainScene.remove(a));
    signalPulseMeshes.forEach(p => brainScene.remove(p));
    neuropilHullMeshes.forEach(h => brainScene.remove(h));

    neuronMeshes = [];
    synapseLines = [];
    synapseArrowMeshes = [];
    signalPulseMeshes = [];
    neuropilHullMeshes = [];
    activeSignalPackets = [];

    const neurons = brainPackage.neurons || [];
    const synapses = brainPackage.synapses || [];

    if (neurons.length === 0) {
        const errOverlay = document.getElementById('brain-error-overlay');
        if (errOverlay) {
            errOverlay.style.display = 'block';
            document.getElementById('brain-error-reason').textContent = 'Zero neurons present in model JSON package.';
        }
        return;
    } else {
        const errOverlay = document.getElementById('brain-error-overlay');
        if (errOverlay) errOverlay.style.display = 'none';
    }

    const posMap = computeStructuredBrainPositions(neurons);
    brainBounds = calculateBrainBoundsFromPosMap(posMap);
    resolvedSynapsesCount = synapses.filter(s => posMap[s.pre_neuron_id] && posMap[s.post_neuron_id]).length;

    createNeuropilBoundaryHulls(brainScene);

    neurons.forEach((n, idx) => {
        const pos = posMap[n.id] || new THREE.Vector3(0, 0, 0);
        const regKey = n.region || 'DEFAULT';
        const hexColor = REGION_COLORS[regKey] || REGION_COLORS['DEFAULT'];

        const morphGroup = createMorphologicalNeuronMesh(n, hexColor);
        morphGroup.position.copy(pos);
        morphGroup.userData = { id: n.id, index: idx, region: regKey, data: n, hexColor: hexColor };

        if (simState.selectedRegion !== 'ALL' && n.region !== simState.selectedRegion) {
            morphGroup.visible = false;
        }

        brainScene.add(morphGroup);
        neuronMeshes.push(morphGroup);
    });

    synapses.forEach(s => {
        const p1 = posMap[s.pre_neuron_id];
        const p2 = posMap[s.post_neuron_id];
        if (p1 && p2) {
            const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const isExcitatory = s.type === "EXCITATORY";
            const lineMat = new THREE.LineBasicMaterial({
                color: isExcitatory ? 0x00f2fe : 0xff3d71,
                transparent: true,
                opacity: 0.22
            });
            const line = new THREE.Line(lineGeom, lineMat);
            line.userData = { pre: s.pre_neuron_id, post: s.post_neuron_id, data: s };

            const arrowDir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const arrowPos = new THREE.Vector3().lerpVectors(p1, p2, 0.7);
            const arrowGeo = new THREE.ConeGeometry(0.018, 0.05, 8);
            const arrowMat = new THREE.MeshBasicMaterial({ color: isExcitatory ? 0x00f2fe : 0xff3d71, transparent: true, opacity: 0.5 });
            const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
            arrowMesh.position.copy(arrowPos);
            arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowDir);

            const preMesh = neuronMeshes.find(m => m.userData.id === s.pre_neuron_id);
            const postMesh = neuronMeshes.find(m => m.userData.id === s.post_neuron_id);
            if ((preMesh && !preMesh.visible) || (postMesh && !postMesh.visible)) {
                line.visible = false;
                arrowMesh.visible = false;
            }

            brainScene.add(line);
            brainScene.add(arrowMesh);
            synapseLines.push(line);
            synapseArrowMeshes.push(arrowMesh);
        }
    });

    rebuild55KInstancedMesh();
    fitToBrain();
}

function updateNeuronInspector(neuronId) {
    if (!brainPackage) return;
    const n = brainPackage.neurons.find(n => n.id === neuronId) || brainPackage.neurons[0];
    if (!n) return;

    const inspId = document.getElementById('insp-id');
    const inspType = document.getElementById('insp-type');
    const inspRegion = document.getElementById('insp-region');
    const inspMorph = document.getElementById('insp-morph');
    const inspMem = document.getElementById('insp-membrane');
    const inspState = document.getElementById('insp-state');
    const inspConn = document.getElementById('insp-conn');

    const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
    const antBrain = selectedAnt ? selectedAnt.brain : null;

    if (inspId) inspId.textContent = n.id;
    if (inspType) inspType.textContent = `${n.cell_type || 'MODEL'} (${n.neurotransmitter || 'GABA'})`;
    if (inspRegion) inspRegion.textContent = n.region || 'CENTRAL';
    if (inspMorph) inspMorph.textContent = "COMPUTATIONAL 3D EMBEDDING";

    if (antBrain) {
        const pot = antBrain.neuronStates[n.id] || n.resting_potential || -65.0;
        const isSpike = antBrain.spikes[n.id] || false;
        if (inspMem) inspMem.textContent = `${pot.toFixed(2)} mV`;
        if (inspState) {
            inspState.textContent = isSpike ? "FIRING SPIKE" : "Resting/Depolarizing";
            inspState.className = isSpike ? "text-amber" : "text-cyan";
        }
    }

    if (inspConn && brainPackage.synapses) {
        const inConn = brainPackage.synapses.filter(s => s.post_neuron_id === n.id).length;
        const outConn = brainPackage.synapses.filter(s => s.pre_neuron_id === n.id).length;
        inspConn.textContent = `In: ${inConn} | Out: ${outConn}`;
    }
}

// Update Signal Transmission Inspector Card
function updateSignalInspector(pkt) {
    if (!pkt) return;
    const elSigId = document.getElementById('sig-id');
    const elSigAnt = document.getElementById('sig-ant');
    const elSigPre = document.getElementById('sig-pre');
    const elSigPost = document.getElementById('sig-post');
    const elSigWeight = document.getElementById('sig-weight');
    const elSigDelay = document.getElementById('sig-delay');
    const elSigStatus = document.getElementById('sig-status');

    if (elSigId) elSigId.textContent = pkt.synapseId || pkt.id;
    if (elSigAnt) elSigAnt.textContent = `ANT #${pkt.antId}`;
    if (elSigPre) elSigPre.textContent = pkt.preId;
    if (elSigPost) elSigPost.textContent = pkt.postId;
    if (elSigWeight) elSigWeight.textContent = (pkt.weight || 0.5).toFixed(2);
    if (elSigDelay) elSigDelay.textContent = `${(pkt.delay || 1.5).toFixed(2)} ms`;
    
    if (elSigStatus) {
        const pct = Math.round(pkt.progress * 100);
        if (pkt.progress >= 1.0) {
            elSigStatus.textContent = "ARRIVED";
            elSigStatus.className = "text-amber";
        } else {
            elSigStatus.textContent = `TRAVELLING (${pct}%)`;
            elSigStatus.className = "text-green";
        }
    }
}

// Update Live Causal Trace Panel UI
function updateCausalTraceUI() {
    const traceListContainer = document.getElementById('causal-trace-list');
    const stepBadge = document.getElementById('trace-step-count');
    if (!traceListContainer) return;

    const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
    const antBrain = selectedAnt ? selectedAnt.brain : null;

    if (stepBadge) stepBadge.textContent = `STEP #${simState.stepCount}`;

    if (!antBrain || antBrain.causalTraceLog.length === 0) {
        traceListContainer.innerHTML = '<div class="trace-item empty">Awaiting runtime neural signal transmission...</div>';
        return;
    }

    traceListContainer.innerHTML = '';
    antBrain.causalTraceLog.slice(0, 10).forEach(logItem => {
        const row = document.createElement('div');
        row.className = 'trace-item font-mono';
        row.innerHTML = `
            <span class="trace-node">${logItem.sensoryNeuron}</span>
            <span class="trace-arrow">──►</span>
            <span class="trace-node">${logItem.interNeuron}</span>
            <span class="trace-arrow">──►</span>
            <span class="trace-node">${logItem.motorNeuron}</span>
            <span class="trace-action">[${logItem.action}]</span>
        `;
        row.addEventListener('click', () => {
            selectedNeuronId = logItem.interNeuron;
            focusNeuron(selectedNeuronId);
            updateNeuronInspector(selectedNeuronId);
        });
        traceListContainer.appendChild(row);
    });
}

// Update System Debug & Event Stream Diagnostics Monitor
function updateDebugDiagnosticsUI() {
    const elSelAnt = document.getElementById('debug-selected-ant');
    const elNeurons = document.getElementById('debug-neurons-loaded');
    const elSynapses = document.getElementById('debug-synapses-loaded');
    const elActNeurons = document.getElementById('debug-active-neurons');
    const elActSynapses = document.getElementById('debug-active-synapses');
    const elEvents = document.getElementById('debug-neural-events');
    const elRate = document.getElementById('debug-events-rate');
    const elRenderedSignals = document.getElementById('debug-rendered-signals');
    const elCompleted = document.getElementById('debug-signals-completed');
    const elLatest = document.getElementById('debug-latest-event');
    const elStatusLine = document.getElementById('debug-status-line');

    const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
    const antBrain = selectedAnt ? selectedAnt.brain : null;

    signalsRenderedCount = signalPulseMeshes.filter(m => m && m.visible).length;

    if (elSelAnt) elSelAnt.textContent = `#${activeSelectedAntId}`;
    if (elNeurons) elNeurons.textContent = `${brainPackage ? brainPackage.neurons.length : 128}`;
    if (elSynapses) elSynapses.textContent = `${brainPackage ? brainPackage.synapses.length : 256}`;
    if (elActNeurons) elActNeurons.textContent = `${antBrain ? antBrain.lastFiredNeurons.length : 0}`;
    if (elActSynapses) elActSynapses.textContent = `${antBrain ? antBrain.lastTransmissions.length : 0}`;
    if (elEvents) elEvents.textContent = `${totalNeuralEventsEmitted}`;
    if (elRate) elRate.textContent = `${currentEventsPerSec}`;
    if (elRenderedSignals) elRenderedSignals.textContent = `${signalsRenderedCount}`;
    if (elCompleted) elCompleted.textContent = `${signalsCompletedCount}`;

    if (elLatest) {
        if (lastEmittedEvent) {
            const pre = lastEmittedEvent.preNeuronId || lastEmittedEvent.neuronId || 'N/A';
            const post = lastEmittedEvent.postNeuronId ? ` ──► ${lastEmittedEvent.postNeuronId}` : ' (SPIKE)';
            const syn = lastEmittedEvent.synapseId ? ` [${lastEmittedEvent.synapseId}]` : '';
            elLatest.textContent = `Latest Event: ${pre}${syn}${post}`;
        } else {
            elLatest.textContent = `Latest Event: None`;
        }
    }

    if (elStatusLine) {
        const activeBrainsCount = activeAnts.filter(a => a.brain).length;
        const stuckCount = activeAnts.filter(a => a.status === 'RECOVERING').length;
        const unownedCount = commTasks.filter(t => t.status === 'PENDING').length;
        elStatusLine.textContent = `Brains: ${activeBrainsCount} active / ${activeAnts.length} init | Independent Runtime: YES | Conflicts: 0 | Stuck: ${stuckCount} | Unowned: ${unownedCount}`;
        elStatusLine.style.color = stuckCount > 0 ? "var(--accent-amber)" : "var(--accent-cyan)";
    }
}

// --- UI & TELEMETRY BINDINGS ---
function initUI() {
    const inspectorSelect = document.getElementById('ant-inspector-select');
    if (inspectorSelect) {
        inspectorSelect.addEventListener('change', (e) => {
            activeSelectedAntId = parseInt(e.target.value);
            appendTerminalLog(`[UI] Connected Observability Inspector & Causal Trace to ANT #${activeSelectedAntId}`, "text-cyan");
            if (selectedNeuronId) updateNeuronInspector(selectedNeuronId);
            updateCausalTraceUI();
        });
    }

    const brainMapModeSelect = document.getElementById('brain-map-mode-select');
    if (brainMapModeSelect) {
        brainMapModeSelect.addEventListener('change', (e) => {
            simState.brainMapMode = e.target.value;
            appendTerminalLog(`[NEURAL MAP] Switched Brain Map Mode to: ${simState.brainMapMode}`, "text-cyan");
            rebuildBrain3D();
        });
    }

    const btnSigLive = document.getElementById('btn-signal-live');
    const btnSigPause = document.getElementById('btn-signal-pause');
    const btnSigStep = document.getElementById('btn-signal-step');
    const btnSigReplay = document.getElementById('btn-signal-replay');
    const btnSigFire = document.getElementById('btn-signal-fire');
    const btnSigFollow = document.getElementById('btn-signal-follow');
    const btnFireSelected = document.getElementById('btn-fire-selected-neuron');

    function setSignalPlaybackMode(mode) {
        simState.signalPlaybackMode = mode;
        [btnSigLive, btnSigPause, btnSigStep, btnSigReplay].forEach(b => b?.classList.remove('active'));
        if (mode === 'LIVE' && btnSigLive) btnSigLive.classList.add('active');
        if (mode === 'PAUSE' && btnSigPause) btnSigPause.classList.add('active');
        if (mode === 'STEP' && btnSigStep) btnSigStep.classList.add('active');
        if (mode === 'REPLAY' && btnSigReplay) btnSigReplay.classList.add('active');
    }

    btnSigLive?.addEventListener('click', () => setSignalPlaybackMode('LIVE'));
    btnSigPause?.addEventListener('click', () => setSignalPlaybackMode('PAUSE'));
    btnSigStep?.addEventListener('click', () => {
        setSignalPlaybackMode('STEP');
        stepSimulation();
    });

    function replayLastEvent() {
        if (!lastEmittedEvent) {
            appendTerminalLog(`[REPLAY WARNING] No neural event available in buffer to replay.`, "text-amber");
            return;
        }
        appendTerminalLog(`[REPLAY] Replaying Neural Event ${lastEmittedEvent.id} (${lastEmittedEvent.preNeuronId || lastEmittedEvent.neuronId} ──► ${lastEmittedEvent.postNeuronId || 'SPIKE'})`, "text-cyan");
        neuralBus.publish(lastEmittedEvent);
    }

    btnSigReplay?.addEventListener('click', () => replayLastEvent());

    const triggerManualFire = () => {
        const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
        if (selectedAnt && selectedAnt.brain) {
            const targetNeuron = selectedNeuronId || "NEURON_0000";
            selectedAnt.brain.fireNeuronManually(targetNeuron);
            focusNeuron(targetNeuron);
            updateNeuronInspector(targetNeuron);
        }
    };

    btnSigFire?.addEventListener('click', triggerManualFire);
    btnFireSelected?.addEventListener('click', triggerManualFire);

    btnSigFollow?.addEventListener('click', () => {
        isCameraFollowingSignal = !isCameraFollowingSignal;
        btnSigFollow.classList.toggle('active', isCameraFollowingSignal);
        appendTerminalLog(`[CAMERA] Signal Follow Mode: ${isCameraFollowingSignal ? 'ENABLED' : 'DISABLED'}`, "text-cyan");
    });

    // 55K LAYER & SLICE CONTROLS BINDINGS
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            active55kLayer = btn.getAttribute('data-layer');
            rebuild55KInstancedMesh();
            appendTerminalLog(`[55K MAP] Selected Layer: ${active55kLayer}`, "text-cyan");
        });
    });

    document.getElementById('btn-prev-layer')?.addEventListener('click', () => {
        let current = active55kLayer === 'ALL' ? 1 : parseInt(active55kLayer);
        current = current <= 1 ? 8 : current - 1;
        active55kLayer = `${current}`;
        document.querySelectorAll('.layer-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-layer') === active55kLayer);
        });
        rebuild55KInstancedMesh();
    });

    document.getElementById('btn-next-layer')?.addEventListener('click', () => {
        let current = active55kLayer === 'ALL' ? 1 : parseInt(active55kLayer);
        current = current >= 8 ? 1 : current + 1;
        active55kLayer = `${current}`;
        document.querySelectorAll('.layer-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-layer') === active55kLayer);
        });
        rebuild55KInstancedMesh();
    });

    document.getElementById('btn-fit-layer')?.addEventListener('click', () => fitLayer());

    // 3D Slicing Range Sliders
    ['slice-x-min', 'slice-x-max', 'slice-y-min', 'slice-y-max', 'slice-z-min', 'slice-z-max'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            sliceBounds.xMin = parseFloat(document.getElementById('slice-x-min').value);
            sliceBounds.xMax = parseFloat(document.getElementById('slice-x-max').value);
            sliceBounds.yMin = parseFloat(document.getElementById('slice-y-min').value);
            sliceBounds.yMax = parseFloat(document.getElementById('slice-y-max').value);
            sliceBounds.zMin = parseFloat(document.getElementById('slice-z-min').value);
            sliceBounds.zMax = parseFloat(document.getElementById('slice-z-max').value);
            rebuild55KInstancedMesh();
        });
    });

    // Preset Slice Buttons
    document.querySelectorAll('.slice-preset-btn[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.getAttribute('data-preset');
            sliceBounds = { xMin: -100, xMax: 100, yMin: -100, yMax: 100, zMin: -100, zMax: 100 };
            if (p === 'FRONT') sliceBounds.zMin = 0;
            else if (p === 'BACK') sliceBounds.zMax = 0;
            else if (p === 'LEFT') sliceBounds.xMax = 0;
            else if (p === 'RIGHT') sliceBounds.xMin = 0;
            else if (p === 'TOP') sliceBounds.yMin = 0;
            else if (p === 'BOTTOM') sliceBounds.yMax = 0;

            document.getElementById('slice-x-min').value = sliceBounds.xMin;
            document.getElementById('slice-x-max').value = sliceBounds.xMax;
            document.getElementById('slice-y-min').value = sliceBounds.yMin;
            document.getElementById('slice-y-max').value = sliceBounds.yMax;
            document.getElementById('slice-z-min').value = sliceBounds.zMin;
            document.getElementById('slice-z-max').value = sliceBounds.zMax;

            rebuild55KInstancedMesh();
            appendTerminalLog(`[3D SLICING] Applied preset: ${p}`, "text-cyan");
        });
    });

    document.getElementById('btn-reset-slices')?.addEventListener('click', () => {
        sliceBounds = { xMin: -100, xMax: 100, yMin: -100, yMax: 100, zMin: -100, zMax: 100 };
        document.getElementById('slice-x-min').value = -100;
        document.getElementById('slice-x-max').value = 100;
        document.getElementById('slice-y-min').value = -100;
        document.getElementById('slice-y-max').value = 100;
        document.getElementById('slice-z-min').value = -100;
        document.getElementById('slice-z-max').value = 100;
        rebuild55KInstancedMesh();
    });

    document.getElementById('slider-neuron-size')?.addEventListener('input', (e) => {
        neuronRenderScale = parseFloat(e.target.value);
        rebuild55KInstancedMesh();
    });

    document.getElementById('btn-fullscreen-view')?.addEventListener('click', () => setSplitLayout('SPLIT'));
    document.getElementById('btn-fullscreen-sim')?.addEventListener('click', () => {
        setSplitLayout(simState.viewLayoutMode === 'SIM_FULL' ? 'SPLIT' : 'SIM_FULL');
    });
    document.getElementById('btn-fullscreen-brain')?.addEventListener('click', () => {
        setSplitLayout(simState.viewLayoutMode === 'BRAIN_FULL' ? 'SPLIT' : 'BRAIN_FULL');
    });
    document.getElementById('btn-fit-brain')?.addEventListener('click', () => fitToBrain());

    document.getElementById('region-filter-select')?.addEventListener('change', (e) => {
        simState.selectedRegion = e.target.value;
        rebuildBrain3D();
    });

    initSplitDivider();

    document.getElementById('btn-toggle-panels')?.addEventListener('click', () => {
        const leftP = document.getElementById('panel-left');
        const rightP = document.getElementById('panel-right');
        const isHidden = leftP.style.display === 'none';
        if (leftP) leftP.style.display = isHidden ? 'flex' : 'none';
        if (rightP) rightP.style.display = isHidden ? 'flex' : 'none';
        onWindowResize();
    });

    document.getElementById('btn-about')?.addEventListener('click', () => {
        document.getElementById('about-modal').style.display = 'flex';
    });

    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
        document.getElementById('about-modal').style.display = 'none';
    });

    document.getElementById('about-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('about-modal')) {
            document.getElementById('about-modal').style.display = 'none';
        }
    });

    document.getElementById('mode-select')?.addEventListener('change', (e) => {
        simState.mode = e.target.value;
        resetSimulation();
    });

    document.getElementById('ants-select')?.addEventListener('change', (e) => {
        simState.antCount = parseInt(e.target.value);
        resetSimulation();
    });

    const targetModeSelect = document.getElementById('target-mode-select');
    const singleLetterContainer = document.getElementById('single-letter-container');
    const sequenceContainer = document.getElementById('sequence-container');

    targetModeSelect?.addEventListener('change', (e) => {
        simState.targetMode = e.target.value;
        if (simState.targetMode === 'SINGLE') {
            if (singleLetterContainer) singleLetterContainer.style.display = 'flex';
            if (sequenceContainer) sequenceContainer.style.display = 'none';
        } else {
            if (singleLetterContainer) singleLetterContainer.style.display = 'none';
            if (sequenceContainer) sequenceContainer.style.display = 'flex';
        }
        resetSimulation();
    });

    document.getElementById('single-key-select')?.addEventListener('change', (e) => {
        simState.singleKeyTarget = e.target.value.toUpperCase();
        resetSimulation();
    });

    const sequencePresetSelect = document.getElementById('sequence-preset-select');
    const customSeqInput = document.getElementById('custom-sequence-input');

    sequencePresetSelect?.addEventListener('change', (e) => {
        simState.sequencePreset = e.target.value;
        if (simState.sequencePreset === 'CUSTOM') {
            if (customSeqInput) customSeqInput.style.display = 'inline-block';
            customSeqInput?.focus();
        } else {
            if (customSeqInput) customSeqInput.style.display = 'none';
            resetSimulation();
        }
    });

    document.getElementById('btn-play')?.addEventListener('click', () => {
        simState.isPlaying = !simState.isPlaying;
        document.getElementById('play-icon').textContent = simState.isPlaying ? '⏸' : '▶';
    });

    document.getElementById('btn-step')?.addEventListener('click', () => {
        simState.isPlaying = false;
        document.getElementById('play-icon').textContent = '▶';
        stepSimulation();
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => resetSimulation());

    document.getElementById('speed-slider')?.addEventListener('input', (e) => {
        simState.speed = parseFloat(e.target.value);
        document.getElementById('speed-val').textContent = `${simState.speed.toFixed(1)}x`;
    });

    document.getElementById('btn-reframe')?.addEventListener('click', () => {
        camera.position.set(1.0, 4.5, 4.5);
        controls.target.set(1.0, 0.3, 0.5);
    });

    document.getElementById('btn-topdown')?.addEventListener('click', () => {
        camera.position.set(1.0, 6.0, -0.501);
        controls.target.set(1.0, 0.0, -0.5);
    });
}

function setSplitLayout(layoutMode) {
    simState.viewLayoutMode = layoutMode;
    const paneSim = document.getElementById('pane-simulation');
    const paneBrain = document.getElementById('pane-brain');
    const divider = document.getElementById('split-divider');

    if (!paneSim || !paneBrain) return;

    if (layoutMode === 'SIM_FULL') {
        paneSim.style.display = 'flex';
        paneSim.style.flex = '1 1 100%';
        paneBrain.style.display = 'none';
        if (divider) divider.style.display = 'none';
    } else if (layoutMode === 'BRAIN_FULL') {
        paneSim.style.display = 'none';
        paneBrain.style.display = 'flex';
        paneBrain.style.flex = '1 1 100%';
        if (divider) divider.style.display = 'none';
    } else {
        paneSim.style.display = 'flex';
        paneBrain.style.display = 'flex';
        paneSim.style.flex = `1 1 ${simState.splitPercent}%`;
        paneBrain.style.flex = `1 1 ${100 - simState.splitPercent}%`;
        if (divider) divider.style.display = 'flex';
    }

    onWindowResize();
}

function initSplitDivider() {
    const divider = document.getElementById('split-divider');
    const wrapper = document.getElementById('split-wrapper');
    const paneSim = document.getElementById('pane-simulation');
    const paneBrain = document.getElementById('pane-brain');

    if (!divider || !wrapper || !paneSim || !paneBrain) return;

    let isDragging = false;

    const onPointerDown = (e) => {
        isDragging = true;
        divider.classList.add('active');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;
        const rect = wrapper.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let percent = ((clientX - rect.left) / rect.width) * 100;
        percent = Math.max(15, Math.min(85, percent));
        simState.splitPercent = percent;

        paneSim.style.flex = `1 1 ${percent}%`;
        paneBrain.style.flex = `1 1 ${100 - percent}%`;

        onWindowResize();
    };

    const onPointerUp = () => {
        if (isDragging) {
            isDragging = false;
            divider.classList.remove('active');
            document.body.style.cursor = 'default';
        }
    };

    divider.addEventListener('mousedown', onPointerDown);
    divider.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
}

function reserveTaskAtomicJS(ant) {
    const now = Date.now();
    commTasks.forEach(t => {
        if ((t.status === 'CLAIMED' || t.status === 'IN_PROGRESS') && (now - (t.lastActivity || now)) > 8000) {
            t.status = 'PENDING';
            t.claimedBy = null;
            if (t.claimedAgents) {
                const idx = t.claimedAgents.indexOf(ant.id);
                if (idx !== -1) t.claimedAgents.splice(idx, 1);
            }
        }
    });

    return ant.evaluateLocalTasks();
}

// --- SIMULATION CONTROLLER ---
function resetSimulation() {
    activeAnts = [];
    commTasks = [];
    celebratedCompletions.clear();
    simState.stepCount = 0;
    simState.completedTasksCount = 0;

    if (simState.targetMode === "SINGLE") {
        simState.activeSequence = [simState.singleKeyTarget];
    } else {
        if (simState.sequencePreset === "CUSTOM") {
            const clean = simState.customSequence.toUpperCase().replace(/[^A-F]/g, '');
            simState.activeSequence = clean ? clean.split('') : ['D', 'E', 'C', 'A', 'F'];
        } else {
            simState.activeSequence = simState.sequencePreset.split('');
        }
    }

    if (simState.mode === "PARALLEL") {
        commTasks = [];
        simState.activeSequence.forEach((char, idx) => {
            commTasks.push({ id: `TA_${idx+1}_${char}#${idx+1}`, target: char, order: idx + 1, kbd: "KEYBOARD_A", status: "PENDING" });
            commTasks.push({ id: `TB_${idx+1}_${char}#${idx+1}`, target: char, order: idx + 1, kbd: "KEYBOARD_B", status: "PENDING" });
        });
    } else {
        commTasks = simState.activeSequence.map((char, idx) => ({
            id: `TASK_${idx+1}_${char}#${idx+1}`, target: char, order: idx + 1, kbd: "KEYBOARD_A", status: "PENDING"
        }));
    }

    const manifest = brainPackage ? brainPackage.manifest : {};
    const neurons = brainPackage ? brainPackage.neurons : [];
    const synapses = brainPackage ? brainPackage.synapses : [];

    for (let i = 0; i < simState.antCount; i++) {
        const ant = new SimAntAgent(i + 1, ANT_COLORS_HEX[i % ANT_COLORS_HEX.length]);
        let startX = 1.0;
        if (simState.mode === "PARALLEL" && i >= Math.ceil(simState.antCount / 2)) {
            startX = 3.0;
        } else {
            startX = 1.0 + (i - (simState.antCount - 1) / 2) * 0.5;
        }
        ant.reset(startX, -0.8, manifest, neurons, synapses);

        const reserved = reserveTaskAtomicJS(ant);
        if (reserved) {
            ant.claimedTask = reserved;
            ant.targetKey = reserved.target;
            const layout = reserved.kbd === "KEYBOARD_B" ? KEYS_KBD_B : (simState.mode === "PARALLEL" ? KEYS_KBD_A : KEYS_SINGLE);
            const targetPos = layout[reserved.target] || layout[`A_${reserved.target}`] || layout[`B_${reserved.target}`] || { x: 1.0, y: 0.0 };
            ant.targetX = targetPos.x;
            ant.targetY = targetPos.y;
            ant.navigationState = "MOVING_TO_TARGET";
            ant.status = "APPROACHING";
            ant.lastDistance = Math.sqrt((ant.targetX - ant.x)**2 + (ant.targetY - ant.y)**2);
        }
        activeAnts.push(ant);
    }

    rebuildKeyboards3D();
    rebuildAnts3D();
    updateTelemetryUI();
    updateCausalTraceUI();
    updateDebugDiagnosticsUI();
}

function stepSimulation() {
    simState.stepCount++;

    // Step environment pheromones, comm bus, and colony demand
    pheromoneField.decay();
    colonyCommBus.step();
    colonyDemand.updateNeedsFromWorld(commTasks, activeAnts);

    activeAnts.forEach((ant) => {
        try {
            if (!ant.brain) return;

            ant.stepCount++;

            // Deposit pheromone along path
            if (ant.status === 'MOVING' || ant.status === 'APPROACHING') {
                pheromoneField.deposit(ant.x, ant.y, 'FOOD', 0.15);
            }

            // 1. TASK CLAIM & RE-EVALUATION
            if (!ant.claimedTask || ant.claimedTask.status === "COMPLETED" || ant.claimedTask.status === "FAILED") {
                const reserved = reserveTaskAtomicJS(ant);
                if (reserved) {
                    ant.claimedTask = reserved;
                    ant.targetKey = reserved.target;
                    const layout = reserved.kbd === "KEYBOARD_B" ? KEYS_KBD_B : (simState.mode === "PARALLEL" ? KEYS_KBD_A : KEYS_SINGLE);
                    const targetPos = layout[reserved.target] || layout[`A_${reserved.target}`] || layout[`B_${reserved.target}`] || { x: 1.0, y: 0.0 };
                    ant.targetX = targetPos.x;
                    ant.targetY = targetPos.y;
                    ant.navigationState = "MOVING_TO_TARGET";
                    ant.status = "APPROACHING";
                    ant.lastDistance = Math.sqrt((ant.targetX - ant.x)**2 + (ant.targetY - ant.y)**2);

                    rewardEngine.emitRewardEvent({
                        ant: ant,
                        taskId: reserved.id,
                        eventType: "TARGET_DISCOVERED",
                        action: "CLAIM_TASK",
                        reason: `Claimed target key [${reserved.target}]`
                    });

                    // Broadcast task claim to nearby ants
                    colonyCommBus.broadcast({
                        senderId: ant.id,
                        type: "TASK_CLAIMED",
                        payload: { taskId: reserved.id, target: reserved.target },
                        location: { x: ant.x, y: ant.y },
                        ttl: 20
                    });
                } else {
                    ant.clearTarget();
                }
            }

            // If ant has no target assigned, keep it safely idle / exploring
            if (ant.targetX === null || ant.targetY === null) {
                ant.navigationState = "IDLE";
                ant.status = "IDLE";
                return;
            }

            // 2. OBSERVATION & SMOOTH MOVEMENT CONTROLLER
            const pheroSense = pheromoneField.sense(ant.x, ant.y, 'FOOD', 1.5);
            const obs = {
                antX: ant.x, antY: ant.y, antTheta: ant.theta,
                targetX: ant.targetX, targetY: ant.targetY,
                foodLeft: Math.min(1.0, 0.5 + pheroSense.gradX * 0.2),
                foodCenter: 0.8,
                foodRight: Math.min(1.0, 0.2 - pheroSense.gradX * 0.2),
                foodOdorConcentration: Math.min(1.0, pheroSense.concentration * 0.2)
            };

            const act = ant.brain.step(obs);

            // Target-facing angle steering
            const targetAngle = Math.atan2(ant.targetY - ant.y, ant.targetX - ant.x);
            let relAngle = targetAngle - ant.theta;
            while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
            while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

            const steerSignal = 0.75 * Math.tanh(relAngle * 2.5) + 0.25 * act.steering_bias;
            ant.theta += steerSignal * 0.35;

            const speed = Math.max(0.1, act.speed_throttle) * 0.15;
            const dx = speed * Math.cos(ant.theta);
            const dy = speed * Math.sin(ant.theta);

            // Progress tracking
            const currentDist = Math.sqrt((ant.targetX - ant.x)**2 + (ant.targetY - ant.y)**2);
            const deltaDist = (ant.lastDistance === Infinity) ? 0 : (ant.lastDistance - currentDist);
            ant.distanceDelta = deltaDist;
            ant.lastDistance = currentDist;

            const distMoved = Math.sqrt((ant.x - ant.prevX)**2 + (ant.y - ant.prevY)**2);
            if (distMoved < 0.005) {
                ant.stuckStepCount++;
            } else {
                ant.stuckStepCount = Math.max(0, ant.stuckStepCount - 1);
            }

            // Oscillation detection
            if (deltaDist <= 0.0001 && distMoved > 0.005) {
                ant.oscillationCount++;
            } else {
                ant.oscillationCount = Math.max(0, ant.oscillationCount - 1);
            }

            ant.isOscillating = (ant.oscillationCount >= 8);

            ant.prevX = ant.x;
            ant.prevY = ant.y;
            ant.x += dx;
            ant.y += dy;

            // Soft anti-collision push between ants with debounced collision penalty
            ant.isBlocked = false;
            activeAnts.forEach((otherAnt) => {
                if (otherAnt.id !== ant.id) {
                    const sepDist = Math.sqrt((ant.x - otherAnt.x)**2 + (ant.y - otherAnt.y)**2);
                    if (sepDist < 0.25 && sepDist > 0.001) {
                        ant.isBlocked = true;
                        const pushAngle = Math.atan2(ant.y - otherAnt.y, ant.x - otherAnt.x);
                        ant.x += Math.cos(pushAngle) * 0.015;
                        ant.y += Math.sin(pushAngle) * 0.015;

                        if (!ant.lastCollisionStep || (simState.stepCount - ant.lastCollisionStep) > 12) {
                            ant.lastCollisionStep = simState.stepCount;
                            rewardEngine.emitRewardEvent({
                                ant: ant,
                                taskId: ant.claimedTask ? ant.claimedTask.id : 'N/A',
                                eventType: "COLLISION",
                                action: "AVOIDANCE",
                                reason: "Proximity collision with another ant"
                            });
                        }
                    }
                }
            });

            ant.trajectory.push({ x: ant.x, y: ant.y });

            // Watchdog Stuck / Oscillation Recovery
            if (ant.stuckStepCount >= 15 || ant.isOscillating) {
                ant.status = "RECOVERING";
                ant.navigationState = "RECOVERING";
                ant.theta += Math.PI * 0.5;
                ant.stuckStepCount = 0;
                ant.oscillationCount = 0;

                colonyCommBus.broadcast({
                    senderId: ant.id,
                    type: "PATH_BLOCKED",
                    payload: { antId: ant.id, location: { x: ant.x, y: ant.y } },
                    location: { x: ant.x, y: ant.y },
                    ttl: 15
                });

                rewardEngine.emitRewardEvent({
                    ant: ant,
                    taskId: ant.claimedTask ? ant.claimedTask.id : 'N/A',
                    eventType: "STUCK_DETECTED",
                    action: "STEER_RECOVERY",
                    reason: "Stuck/Oscillation in place detected"
                });

                if (ant.claimedTask && ant.claimedTask.status !== "COMPLETED") {
                    ant.claimedTask.status = "PENDING";
                    ant.claimedTask.claimedBy = null;
                    ant.claimedTask = null;
                }
            } else if (currentDist <= 0.3) {
                ant.navigationState = "INTERACTING";
                ant.status = "INTERACTING";
            } else if (currentDist <= 1.0) {
                ant.navigationState = "APPROACHING";
                ant.status = "APPROACHING";
            } else {
                if (ant.status !== "RECOVERING") {
                    ant.navigationState = "MOVING_TO_TARGET";
                    ant.status = "MOVING";
                }
            }

            if (ant.claimedTask && ant.claimedTask.status !== "COMPLETED") {
                ant.claimedTask.status = "IN_PROGRESS";
                ant.claimedTask.lastActivity = Date.now();
            }

            // 3. TARGET ARRIVAL & IDEMPOTENT COMPLETION / CELEBRATION
            if (currentDist <= KEY_RADIUS && ant.claimedTask && ant.claimedTask.status === "IN_PROGRESS") {
                const task = ant.claimedTask;

                // Mark task COMPLETED idempotently
                task.status = "COMPLETED";
                task.completedAt = Date.now();
                task.completedBy = ant.id;
                simState.completedTasksCount++;

                // Reinforce successful route with strong HOME and FOOD pheromones
                pheromoneField.deposit(ant.x, ant.y, 'FOOD', 3.0);
                pheromoneField.deposit(ant.x, ant.y, 'HOME', 2.0);

                colonyCommBus.broadcast({
                    senderId: ant.id,
                    type: "TASK_COMPLETE",
                    payload: { taskId: task.id, target: task.target },
                    location: { x: ant.x, y: ant.y },
                    ttl: 30
                });

                // Authoritative Reward Emission ONCE per task completion
                if (!ant.rewardIssuedForTasks.has(task.id)) {
                    ant.rewardIssuedForTasks.add(task.id);

                    rewardEngine.emitRewardEvent({
                        ant: ant,
                        taskId: task.id,
                        eventType: "CORRECT_KEY_PRESSED",
                        action: "PRESS_KEY",
                        reason: `Reached target key [${ant.targetKey}]`
                    });

                    rewardEngine.emitRewardEvent({
                        ant: ant,
                        taskId: task.id,
                        eventType: "TASK_COMPLETED",
                        action: "COMPLETE_TASK",
                        reason: `Completed task #${task.order} [${task.target}]`
                    });
                }

                // Trigger celebration ONCE per task completion ID
                const completionId = `${task.id}_owner${ant.id}`;
                if (!celebratedCompletions.has(completionId)) {
                    celebratedCompletions.add(completionId);
                    if (window.confetti) confetti({ particleCount: 50, spread: 50 });
                }

                // Clear target navigation state
                ant.claimedTask = null;
                ant.targetKey = null;
                ant.targetX = null;
                ant.targetY = null;
                ant.navigationState = "COMPLETED";

                // Request next task
                const nextTask = reserveTaskAtomicJS(ant);
                if (nextTask) {
                    ant.claimedTask = nextTask;
                    ant.targetKey = nextTask.target;
                    const layout = nextTask.kbd === "KEYBOARD_B" ? KEYS_KBD_B : (simState.mode === "PARALLEL" ? KEYS_KBD_A : KEYS_SINGLE);
                    const targetPos = layout[nextTask.target] || layout[`A_${nextTask.target}`] || layout[`B_${nextTask.target}`] || { x: 1.0, y: 0.0 };
                    ant.targetX = targetPos.x;
                    ant.targetY = targetPos.y;
                    ant.navigationState = "MOVING_TO_TARGET";
                    ant.status = "APPROACHING";
                    ant.lastDistance = Math.sqrt((ant.targetX - ant.x)**2 + (ant.targetY - ant.y)**2);
                } else {
                    ant.navigationState = "IDLE";
                    ant.status = "IDLE";
                }
            }

            // Step Limit Timeout Safety
            if (ant.stepCount >= MAX_STEPS && ant.status !== "COMPLETED") {
                if (ant.claimedTask && ant.claimedTask.status !== "COMPLETED") {
                    ant.claimedTask.status = "PENDING";
                    ant.claimedTask.claimedBy = null;
                    ant.claimedTask = null;
                }
                ant.status = "IDLE";
                ant.stepCount = 0;
                appendTerminalLog(`[TIMEOUT] Ant #${ant.id} step limit reached. Re-evaluating tasks.`, "text-muted");
            }
        } catch (err) {
            ant.status = "FAILED";
            ant.navigationState = "FAILED";
            appendTerminalLog(`[ANT #${ant.id} ERROR] ${err.message}`, "text-amber");
        }
    });

    activeAnts.forEach((ant, idx) => {
        if (trajectoryGeometries[idx]) {
            const points = ant.trajectory.map(p => new THREE.Vector3(p.x, 0.05, -p.y));
            trajectoryGeometries[idx].setFromPoints(points);
        }
    });

    updateTelemetryUI();
    updateCausalTraceUI();
    updateDebugDiagnosticsUI();
    if (selectedNeuronId) updateNeuronInspector(selectedNeuronId);
    if (activeInspectorSignal) updateSignalInspector(activeInspectorSignal);
}

function updateTelemetryUI() {
    document.getElementById('val-mode').textContent = simState.mode;
    document.getElementById('val-ant-count').textContent = `${simState.antCount} Ants`;
    
    const badgeEl = document.getElementById('val-collab-mode-badge');
    if (badgeEl) badgeEl.textContent = simState.orderingMode;

    const currentTargetEl = document.getElementById('val-current-target');
    const targetSeqEl = document.getElementById('val-target-sequence');
    
    let activeKey = "E";
    if (simState.targetMode === "SINGLE") {
        activeKey = simState.singleKeyTarget;
        if (currentTargetEl) currentTargetEl.textContent = activeKey;
        if (targetSeqEl) targetSeqEl.innerHTML = `[<span class="active">${activeKey}</span>]`;
    } else {
        const seq = simState.activeSequence;
        const currentIdx = Math.min(simState.completedTasksCount, seq.length - 1);
        activeKey = seq[currentIdx] || seq[0] || "E";
        if (currentTargetEl) currentTargetEl.textContent = activeKey;
        if (targetSeqEl) {
            const formattedSeq = seq.map((c, i) => i === currentIdx ? `<span class="active">${c}</span>` : c).join('-');
            targetSeqEl.innerHTML = `[${formattedSeq}]`;
        }
    }

    // Role Counts
    const foragersCount = activeAnts.filter(a => a.role === 'FORAGER').length;
    const explorersCount = activeAnts.filter(a => a.role === 'EXPLORER').length;
    const buildersCount = activeAnts.filter(a => a.role === 'BUILDER').length;
    const recruitingCount = activeAnts.filter(a => a.status === 'WAITING_FOR_HELP' || a.role === 'RECRUITER').length;

    const elFor = document.getElementById('stat-foragers'); if (elFor) elFor.textContent = foragersCount;
    const elExp = document.getElementById('stat-explorers'); if (elExp) elExp.textContent = explorersCount;
    const elBld = document.getElementById('stat-builders'); if (elBld) elBld.textContent = buildersCount;
    const elRec = document.getElementById('stat-recruiting'); if (elRec) elRec.textContent = recruitingCount;

    const elMsgRate = document.getElementById('stat-msg-rate'); if (elMsgRate) elMsgRate.textContent = colonyCommBus.messages.length;
    const elTrails = document.getElementById('stat-phero-trails'); if (elTrails) elTrails.textContent = pheromoneField.getActiveTrailCount();
    const elCoop = document.getElementById('stat-coop-tasks'); if (elCoop) elCoop.textContent = commTasks.filter(t => (t.requiredAgents || 1) > 1).length;
    const elClaims = document.getElementById('stat-active-claims'); if (elClaims) elClaims.textContent = commTasks.filter(t => t.status === 'CLAIMED' || t.status === 'IN_PROGRESS').length;

    const taskListContainer = document.getElementById('task-ownership-list');
    if (taskListContainer) {
        taskListContainer.innerHTML = '';
        commTasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'task-item-row';
            const ownerAnt = activeAnts.find(a => a.claimedTask && a.claimedTask.id === task.id);
            const ownerLabel = ownerAnt ? `<span style="color:${ownerAnt.colorHex}">Ant #${ownerAnt.id}</span>` : 'Unassigned';
            
            let statusClass = 'text-muted';
            if (task.status === 'COMPLETED') statusClass = 'text-green';
            else if (task.status === 'IN_PROGRESS') statusClass = 'text-cyan';
            else if (task.status === 'CLAIMED') statusClass = 'text-amber';

            row.innerHTML = `
                <span class="t-key">#${task.order || 1} [${task.target}]</span>
                <span class="t-owner">${ownerLabel}</span>
                <span class="t-status ${statusClass}">${task.status}</span>
            `;
            taskListContainer.appendChild(row);
        });
    }

    document.getElementById('val-progress').textContent = `${simState.completedTasksCount} / ${commTasks.length} Keys`;
    document.getElementById('seq-progress-bar').style.width = `${(simState.completedTasksCount / Math.max(1, commTasks.length)) * 100}%`;

    // Update Authoritative Reward Engine Card & Intent Inspector Card for Selected Ant
    const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
    if (selectedAnt) {
        if (selectedAnt.rewardState) {
            const rwd = selectedAnt.rewardState;
            const elAnt = document.getElementById('rwd-ant-id'); if (elAnt) elAnt.textContent = `Ant #${selectedAnt.id}`;
            const elEp = document.getElementById('rwd-episode'); if (elEp) elEp.textContent = `${rwd.episodeReward >= 0 ? '+' : ''}${rwd.episodeReward.toFixed(2)}`;
            const elLast = document.getElementById('rwd-last'); if (elLast) elLast.textContent = `${rwd.lastReward >= 0 ? '+' : ''}${rwd.lastReward.toFixed(2)}`;
            const elReason = document.getElementById('rwd-reason'); if (elReason) elReason.textContent = rwd.lastRewardReason;
            const elPos = document.getElementById('rwd-pos-total'); if (elPos) elPos.textContent = `+${rwd.positiveRewardTotal.toFixed(2)}`;
            const elNeg = document.getElementById('rwd-neg-total'); if (elNeg) elNeg.textContent = `-${rwd.negativeRewardTotal.toFixed(2)}`;
        }

        // --- UPDATE "WHY IS THIS ANT DOING THIS?" INTENT INSPECTOR CARD ---
        const elIntAnt = document.getElementById('intent-ant-id'); if (elIntAnt) elIntAnt.textContent = `ANT #${selectedAnt.id}`;
        const elIntRole = document.getElementById('intent-role');
        if (elIntRole) {
            elIntRole.textContent = selectedAnt.role || "FORAGER";
            elIntRole.className = `badge ${selectedAnt.role === 'FORAGER' ? 'badge-active' : 'badge-searching'}`;
        }
        const elIntMotiv = document.getElementById('intent-role-motivation'); if (elIntMotiv) elIntMotiv.textContent = selectedAnt.roleMotivation || "Local stimulus perception";
        const elIntTaskId = document.getElementById('intent-task-id'); if (elIntTaskId) elIntTaskId.textContent = selectedAnt.claimedTask ? `#${selectedAnt.claimedTask.order} [${selectedAnt.targetKey}]` : "None";
        const elIntTaskStat = document.getElementById('intent-task-status'); if (elIntTaskStat) elIntTaskStat.textContent = selectedAnt.claimedTask ? selectedAnt.claimedTask.status : "IDLE";
        const elIntSubRole = document.getElementById('intent-sub-role'); if (elIntSubRole) elIntSubRole.textContent = selectedAnt.coActionSubRole || "NONE";
        const elIntSyncState = document.getElementById('intent-sync-state'); if (elIntSyncState) elIntSyncState.textContent = selectedAnt.coActionState || "NONE";

        const elIntUtils = document.getElementById('intent-top-utilities');
        if (elIntUtils) {
            if (selectedAnt.topEvaluatedUtilities && selectedAnt.topEvaluatedUtilities.length > 0) {
                elIntUtils.innerHTML = selectedAnt.topEvaluatedUtilities.map((u, i) => `
                    <div>${i+1}. Task [${u.target}]: Net Utility = <strong>${u.utility >= 0 ? '+' : ''}${u.utility.toFixed(2)}</strong> (Dist: ${u.breakdown.dist}m, Phero: +${u.breakdown.phero}, RoleFit: +${u.breakdown.roleFit}, Congest: -${u.breakdown.congest})</div>
                `).join('');
            } else {
                elIntUtils.innerHTML = '<div class="text-muted">No candidate tasks evaluated in current range.</div>';
            }
        }

        const pheroAtAnt = pheromoneField.sense(selectedAnt.x, selectedAnt.y, 'FOOD', 1.5);
        const homePheroAtAnt = pheromoneField.sense(selectedAnt.x, selectedAnt.y, 'HOME', 1.5);
        const recruitPheroAtAnt = pheromoneField.sense(selectedAnt.x, selectedAnt.y, 'RECRUITMENT', 1.5);

        const elIntPheroF = document.getElementById('intent-phero-food'); if (elIntPheroF) elIntPheroF.textContent = pheroAtAnt.concentration.toFixed(2);
        const elIntPheroH = document.getElementById('intent-phero-home'); if (elIntPheroH) elIntPheroH.textContent = homePheroAtAnt.concentration.toFixed(2);
        const elIntPheroR = document.getElementById('intent-phero-recruit'); if (elIntPheroR) elIntPheroR.textContent = recruitPheroAtAnt.concentration.toFixed(2);

        const nearbyMsgs = colonyCommBus.getNearbyMessages(selectedAnt.x, selectedAnt.y, selectedAnt.sensorRadius);
        const elIntMsgs = document.getElementById('intent-messages');
        if (elIntMsgs) {
            if (nearbyMsgs.length > 0) {
                elIntMsgs.textContent = nearbyMsgs.map(m => `${m.type} from Ant #${m.senderId} (TTL: ${m.ttl}t)`).join(', ');
            } else {
                elIntMsgs.textContent = "No active messages in local sensing range (3.0m)";
            }
        }

        const elIntReason = document.getElementById('intent-action-reason');
        if (elIntReason) {
            elIntReason.textContent = `"${selectedAnt.lastDecisionReason}"`;
        }
    }

    const roster = document.getElementById('agents-roster');
    if (roster) {
        roster.innerHTML = '';
        activeAnts.forEach((ant) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            const isSelected = ant.id === activeSelectedAntId;

            let badgeClass = 'badge-searching';
            if (ant.status === 'COMPLETED') badgeClass = 'badge-success';
            else if (ant.status === 'RECOVERING' || ant.status === 'FAILED') badgeClass = 'badge-danger';
            else if (ant.status === 'INTERACTING') badgeClass = 'badge-active';

            const currentDist = (ant.targetX !== null && ant.targetY !== null) ? Math.sqrt((ant.targetX - ant.x)**2 + (ant.targetY - ant.y)**2) : 0.0;
            const distStr = (ant.targetX !== null) ? currentDist.toFixed(2) : "0.00";
            const deltaStr = ant.distanceDelta >= 0 ? `+${ant.distanceDelta.toFixed(3)}` : `${ant.distanceDelta.toFixed(3)}`;

            card.innerHTML = `
                <div class="agent-header">
                    <span class="ant-id-badge">
                        <span class="ant-dot" style="background: ${ant.colorHex}"></span> Ant #${ant.id} <span class="sub-badge" style="background: rgba(255,255,255,0.1); color: var(--accent-cyan); font-size: 8px;">${ant.role}</span> ${isSelected ? '<span class="text-cyan">(Selected)</span>' : ''}
                    </span>
                    <span class="badge ${badgeClass}">${ant.navigationState || ant.status}</span>
                </div>
                <div class="agent-details font-mono" style="font-size: 9px; margin-top: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px;">
                    <div>Brain: <strong class="text-cyan">LIF #${ant.id}</strong></div>
                    <div>Task: <strong>#${ant.claimedTask ? ant.claimedTask.order : '-'} [${ant.targetKey || 'None'}]</strong></div>
                    <div>Distance: <strong>${distStr}m</strong></div>
                    <div>Progress: <strong class="${ant.distanceDelta >= 0 ? 'text-green' : 'text-amber'}">${deltaStr}m</strong></div>
                    <div>Sub-Role: <strong class="text-purple">${ant.coActionSubRole}</strong></div>
                    <div>Blocked: <strong class="${ant.isBlocked ? 'text-amber' : 'text-muted'}">${ant.isBlocked ? 'YES' : 'NO'}</strong></div>
                    <div style="grid-column: span 2;">Reward: <strong>+${ant.totalReward.toFixed(2)}</strong> | Motivation: <span class="text-muted" style="font-size: 8px;">${ant.roleMotivation.substr(0, 30)}...</span></div>
                </div>
            `;

            card.style.cursor = 'pointer';
            if (isSelected) card.style.border = '1px solid var(--accent-cyan)';

            card.addEventListener('click', () => {
                activeSelectedAntId = ant.id;
                const inspSelect = document.getElementById('ant-inspector-select');
                if (inspSelect) inspSelect.value = `${ant.id}`;
                appendTerminalLog(`[TELEMETRY] Selected Ant #${ant.id} (Role: ${ant.role}, LIF Brain Instance #${ant.id})`, "text-cyan");
                updateTelemetryUI();
                updateCausalTraceUI();
                updateDebugDiagnosticsUI();
            });

            roster.appendChild(card);
        });
    }
}

function appendTerminalLog(msg, colorClass = "") {
    const logBox = document.getElementById('comm-log');
    if (!logBox) return;
    const line = document.createElement('div');
    line.className = `log-line ${colorClass}`;
    line.textContent = `[${(performance.now() / 1000).toFixed(2)}s] ${msg}`;
    logBox.appendChild(line);

    if (logBox.children.length > 50) {
        logBox.removeChild(logBox.firstChild);
    }
    logBox.scrollTop = logBox.scrollHeight;
}

function inspectAndPrintModelDetails(manifest, neurons, synapses) {
    console.log("%c=== ANT BRAIN MODEL INSPECTION ===", "color: #00f2fe; font-weight: bold; font-size: 14px;");
    console.log("Model Name:", manifest.model_name);
    console.log("Species:", manifest.species_profile);
    console.log("Neuron Count:", neurons.length);
    console.log("Synapse Count:", synapses.length);
    console.log("Neuropil Regions:", manifest.neuropil_regions_count || 16);
    console.log("Sample Neuron IDs:", neurons.slice(0, 5).map(n => n.id));
    console.log("Sample Synapse Pre->Post:", synapses.slice(0, 5).map(s => `${s.pre_neuron_id} -> ${s.post_neuron_id} (w=${s.weight})`));
    console.log("Spatial Layout Strategy: COMPUTATIONAL 3D EMBEDDING (Formica rufa neuropil architecture)");
    console.log("Spiking Dynamics: LEAKY INTEGRATE-AND-FIRE (LIF) + Event Bus");
    console.log("%c==================================", "color: #00f2fe; font-weight: bold;");
}

function loadPackage(dir) {
    Promise.all([
        fetch(`${dir}/model_manifest.json`).then(r => r.json()),
        fetch(`${dir}/neurons/neurons.json`).then(r => r.json()),
        fetch(`${dir}/synapses/synapses.json`).then(r => r.json())
    ]).then(([manifest, neurons, synapses]) => {
        brainPackage = { manifest, neurons, synapses };

        // Parse and build full 55,000 Modeled Neuron Dataset across 8 layers
        parsed55kNeurons = build55KModeledNeuronDataset(neurons);

        const elNCount = document.getElementById('model-neuron-count');
        if (elNCount) elNCount.textContent = `55,000 Modeled Neurons`;
        const elSCount = document.getElementById('model-synapse-count');
        if (elSCount) elSCount.textContent = `${synapses.length} Synapses`;

        inspectAndPrintModelDetails(manifest, neurons, synapses);
        rebuildBrain3D();
        resetSimulation();
        appendTerminalLog(`[MODEL] Loaded model package: ${manifest.model_name || dir} (55,000 Modeled Neurons in 8 Layers, ${synapses.length} Synapses)`, "text-cyan");
    }).catch(err => {
        console.error("Error loading model package:", err);
        const errOverlay = document.getElementById('brain-error-overlay');
        if (errOverlay) {
            errOverlay.style.display = 'block';
            document.getElementById('brain-error-reason').textContent = `Failed to load model files: ${err.message}`;
        }
    });
}

function onWindowResize() {
    const paneSim = document.getElementById('pane-simulation');
    if (paneSim && renderer && camera) {
        const width = paneSim.clientWidth;
        const height = paneSim.clientHeight;
        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    }

    const paneBrain = document.getElementById('pane-brain');
    if (paneBrain && brainRenderer && brainCamera) {
        const bWidth = paneBrain.clientWidth;
        const bHeight = paneBrain.clientHeight;
        if (bWidth > 0 && bHeight > 0) {
            brainCamera.aspect = bWidth / bHeight;
            brainCamera.updateProjectionMatrix();
            brainRenderer.setSize(bWidth, bHeight);
        }
    }
}

function initResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => onWindowResize());
        const containerSim = document.getElementById('pane-simulation');
        const containerBrain = document.getElementById('pane-brain');
        if (containerSim) observer.observe(containerSim);
        if (containerBrain) observer.observe(containerBrain);
    }
    window.addEventListener('resize', onWindowResize);
}

// --- MAIN ANIMATION LOOP WITH UNMISSABLE WHITE GLOWING SIGNAL BALLS ---
let lastStepTime = 0;

function animate(time) {
    requestAnimationFrame(animate);

    if (controls) controls.update();
    if (brainControls) brainControls.update();

    activeAnts.forEach((ant, idx) => {
        if (antMeshes[idx]) {
            antMeshes[idx].position.set(ant.x, 0.0, -ant.y);
            antMeshes[idx].rotation.y = ant.theta - Math.PI / 2;

            if (!ant.done && simState.isPlaying) {
                const legSwing = Math.sin(time * 0.015 + idx) * 0.3;
                if (antLegsList[idx]) {
                    antLegsList[idx].forEach((leg, lIdx) => {
                        leg.rotation.x = (lIdx % 2 === 0 ? legSwing : -legSwing);
                    });
                }
            }
        }
    });

    const stepInterval = 200 / simState.speed;
    if (simState.isPlaying && simState.signalPlaybackMode !== 'PAUSE' && (time - lastStepTime > stepInterval)) {
        stepSimulation();
        lastStepTime = time;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }

    // 3D NEURAL MAP RENDER LOOP
    if (brainRenderer && brainScene && brainCamera) {
        const selectedAnt = activeAnts.find(a => a.id === activeSelectedAntId) || activeAnts[0];
        const antBrain = selectedAnt ? selectedAnt.brain : null;

        const posMap = {};
        neuronMeshes.forEach(m => { posMap[m.userData.id] = m.position; });

        const camPos = brainCamera.position;

        // Active Signal Pathway Tracking Sets for Dynamic Opacity Fading
        const activePathPreIds = new Set(activeSignalPackets.map(p => p.preId));
        const activePathPostIds = new Set(activeSignalPackets.map(p => p.postId));
        const activePathRegionSet = new Set();

        if (brainPackage && brainPackage.neurons) {
            activeSignalPackets.forEach(p => {
                const preN = brainPackage.neurons.find(n => n.id === p.preId);
                const postN = brainPackage.neurons.find(n => n.id === p.postId);
                if (preN && preN.region) activePathRegionSet.add(preN.region);
                if (postN && postN.region) activePathRegionSet.add(postN.region);
            });
        }

        const isSignalActive = activeSignalPackets.length > 0;

        // Apply Brain Map Mode & Live Signal Focus Mode Rules
        neuronMeshes.forEach(morphGroup => {
            const nid = morphGroup.userData.id;
            const reg = morphGroup.userData.region;
            const isSpike = antBrain ? antBrain.spikes[nid] : false;
            const isSelected = selectedNeuronId === nid;
            const isPathNeuron = activePathPreIds.has(nid) || activePathPostIds.has(nid);
            const isRelatedRegion = activePathRegionSet.has(reg);

            let isVisible = true;
            if (simState.brainMapMode === 'REGION') {
                isVisible = (simState.selectedRegion === 'ALL' || reg === simState.selectedRegion);
            } else if (simState.brainMapMode === 'SINGLE') {
                isVisible = isSelected || (selectedNeuronId && (
                    brainPackage.synapses.some(s => (s.pre_neuron_id === selectedNeuronId && s.post_neuron_id === nid) || (s.post_neuron_id === selectedNeuronId && s.pre_neuron_id === nid))
                ));
            } else if (simState.brainMapMode === 'TRACE') {
                isVisible = isSpike || isSelected || isPathNeuron;
            }

            morphGroup.visible = isVisible;

            if (isVisible) {
                const dist = camPos.distanceTo(morphGroup.position);
                const stemMesh = morphGroup.children[1];
                if (stemMesh) stemMesh.visible = dist < 10 || isSelected || isPathNeuron;

                const somaMesh = morphGroup.children[0];
                if (somaMesh && somaMesh.material) {
                    somaMesh.material.transparent = true;

                    let targetOpacity = 1.0;
                    let targetEmissive = 0.25;

                    if (isSignalActive || simState.brainMapMode === 'TRACE') {
                        if (isPathNeuron || isSpike || isSelected) {
                            targetOpacity = 1.0;
                            targetEmissive = isSpike ? 2.0 : 1.4;
                        } else if (isRelatedRegion) {
                            targetOpacity = 0.40; // Related neuropil context (40%)
                            targetEmissive = 0.3;
                        } else {
                            targetOpacity = 0.12; // Faint structural background context (12%)
                            targetEmissive = 0.08;
                        }
                    }

                    somaMesh.material.opacity = THREE.MathUtils.lerp(somaMesh.material.opacity || 1.0, targetOpacity, 0.1);
                    somaMesh.material.emissiveIntensity = THREE.MathUtils.lerp(somaMesh.material.emissiveIntensity || 0.25, targetEmissive, 0.1);

                    const targetScale = isSpike ? 1.6 : (isPathNeuron ? 1.4 : (isSelected ? 1.3 : 1.0));
                    somaMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
                }
            }
        });

        // Synapse Line & Arrow Visibility & Dynamic Fading
        synapseLines.forEach((line, idx) => {
            const preId = line.userData.pre;
            const postId = line.userData.post;
            const preMesh = neuronMeshes.find(m => m.userData.id === preId);
            const postMesh = neuronMeshes.find(m => m.userData.id === postId);
            const arrowMesh = synapseArrowMeshes[idx];

            let lineVisible = !!(preMesh && postMesh && preMesh.visible && postMesh.visible);

            const isTransmitting = activeSignalPackets.some(p => p.preId === preId && p.postId === postId);
            const isConnectedToSelected = selectedNeuronId && (preId === selectedNeuronId || postId === selectedNeuronId);

            if (simState.brainMapMode === 'TRACE') {
                lineVisible = lineVisible && (isTransmitting || isConnectedToSelected);
            }

            line.visible = lineVisible;
            if (arrowMesh) arrowMesh.visible = lineVisible;

            if (lineVisible && line.material) {
                let targetLineOpacity = 0.22;
                if (isSignalActive) {
                    if (isTransmitting || isConnectedToSelected) {
                        targetLineOpacity = 1.0; // Active pathway connection 100% opacity
                    } else {
                        targetLineOpacity = 0.05; // Faint background connection (5%)
                    }
                }

                line.material.opacity = THREE.MathUtils.lerp(line.material.opacity, targetLineOpacity, 0.1);
                if (arrowMesh && arrowMesh.material) {
                    arrowMesh.material.opacity = THREE.MathUtils.lerp(arrowMesh.material.opacity, targetLineOpacity, 0.1);
                }
            }
        });

        // ANIMATE UNMISSABLE WHITE GLOWING SIGNAL BALLS
        for (let i = activeSignalPackets.length - 1; i >= 0; i--) {
            const pkt = activeSignalPackets[i];
            const p1 = posMap[pkt.preId];
            const p2 = posMap[pkt.postId];

            if (!p1 || !p2) {
                activeSignalPackets.splice(i, 1);
                continue;
            }

            pkt.progress += pkt.speed || 0.012;

            if (!pkt.mesh) {
                // UNMISSABLE WHITE GLOWING SIGNAL BALL MESH (Pure White Core + Soft White Halo)
                const ballGroup = new THREE.Group();

                // 1. Pure White Bright Core Sphere
                const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
                const coreMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    depthTest: false,
                    depthWrite: false
                });
                const coreMesh = new THREE.Mesh(coreGeo, coreMat);
                coreMesh.renderOrder = 9999;

                // 2. Larger Soft White Halo/Glow Mesh
                const haloGeo = new THREE.SphereGeometry(0.30, 16, 16);
                const haloMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending,
                    depthTest: false,
                    depthWrite: false
                });
                const haloMesh = new THREE.Mesh(haloGeo, haloMat);
                haloMesh.renderOrder = 9999;

                ballGroup.add(coreMesh);
                ballGroup.add(haloMesh);
                ballGroup.renderOrder = 9999; // Render on top of connection lines and somas
                ballGroup.position.copy(p1);

                pkt.mesh = ballGroup;
                brainScene.add(pkt.mesh);
                signalPulseMeshes.push(pkt.mesh);
            }

            // Adaptive distance scaling so signal is clear at both close and far zoom
            const distToCam = brainCamera.position.distanceTo(p1);
            const adaptiveScale = Math.max(1.0, distToCam * 0.15);
            pkt.mesh.scale.setScalar(adaptiveScale);

            // Interpolate position along real synaptic connection
            pkt.mesh.position.lerpVectors(p1, p2, Math.min(1.0, pkt.progress));

            // Optional Camera Follow Signal Logic
            if (isCameraFollowingSignal && i === activeSignalPackets.length - 1 && pkt.mesh) {
                brainControls.target.lerp(pkt.mesh.position, 0.08);
            }

            // Update Signal Transmission Inspector Card
            updateSignalInspector(pkt);

            if (pkt.progress >= 1.0) {
                signalsCompletedCount++;
                // Post-neuron arrival illumination flash
                const postMesh = neuronMeshes.find(m => m.userData.id === pkt.postId);
                if (postMesh && postMesh.children[0]) {
                    const somaMesh = postMesh.children[0];
                    const origColor = postMesh.userData.hexColor || 0x00f2fe;
                    somaMesh.material.color.setHex(0xffffff);
                    somaMesh.material.emissiveIntensity = 2.5;
                    setTimeout(() => {
                        if (somaMesh && somaMesh.material) {
                            somaMesh.material.color.setHex(origColor);
                            somaMesh.material.emissiveIntensity = 0.25;
                        }
                    }, 250);
                }

                brainScene.remove(pkt.mesh);
                const idx = signalPulseMeshes.indexOf(pkt.mesh);
                if (idx !== -1) signalPulseMeshes.splice(idx, 1);
                activeSignalPackets.splice(i, 1);
            }
        }

        updateDebugDiagnosticsUI();
        if (brainRenderer && brainScene && brainCamera) {
            brainRenderer.render(brainScene, brainCamera);
        }
    }
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    init3DSimulation();
    init3DBrain();
    initUI();
    initResizeObserver();
    loadPackage(simState.modelDir);
    requestAnimationFrame(animate);
});
