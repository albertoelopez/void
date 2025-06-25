/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IChatThreadService } from './chatThreadService.js';

export interface AgentInstance {
	id: string;
	name: string;
	threadId: string;
	isActive: boolean;
	isRunning: boolean;
	createdAt: Date;
	lastActivity: Date;
}

export interface IMultiAgentService {
	readonly _serviceBrand: undefined;

	readonly agents: AgentInstance[];
	readonly activeAgentId: string | null;

	onDidChangeAgents: Event<void>;
	onDidChangeActiveAgent: Event<string | null>;
	onDidChangeAgentStatus: Event<{ agentId: string; isRunning: boolean }>;

	createAgent(name?: string): AgentInstance;
	removeAgent(agentId: string): boolean;
	switchToAgent(agentId: string): boolean;
	getAgent(agentId: string): AgentInstance | undefined;
	updateAgentStatus(agentId: string, isRunning: boolean): void;
	renameAgent(agentId: string, newName: string): boolean;

	// Batch operations
	removeAllAgents(): void;
	getRunningAgents(): AgentInstance[];
	stopAllAgents(): Promise<void>;
}

const IMultiAgentService = createDecorator<IMultiAgentService>('multiAgentService');

class MultiAgentService extends Disposable implements IMultiAgentService {
	_serviceBrand: undefined;

	private readonly _onDidChangeAgents = new Emitter<void>();
	readonly onDidChangeAgents: Event<void> = this._onDidChangeAgents.event;

	private readonly _onDidChangeActiveAgent = new Emitter<string | null>();
	readonly onDidChangeActiveAgent: Event<string | null> = this._onDidChangeActiveAgent.event;

	private readonly _onDidChangeAgentStatus = new Emitter<{ agentId: string; isRunning: boolean }>();
	readonly onDidChangeAgentStatus: Event<{ agentId: string; isRunning: boolean }> = this._onDidChangeAgentStatus.event;

	private _agents: AgentInstance[] = [];
	private _activeAgentId: string | null = null;

	constructor(
		@IChatThreadService private readonly _chatThreadService: IChatThreadService,
	) {
		super();

		// Create initial agent
		this._createInitialAgent();

		// Listen to chat thread changes to update agent status
		this._register(this._chatThreadService.onDidChangeStreamState(({ threadId }) => {
			const agent = this._agents.find(a => a.threadId === threadId);
			if (agent) {
				const streamState = this._chatThreadService.streamState[threadId];
				const isRunning = streamState?.isRunning !== undefined;
				if (agent.isRunning !== isRunning) {
					agent.isRunning = isRunning;
					agent.lastActivity = new Date();
					this._onDidChangeAgentStatus.fire({ agentId: agent.id, isRunning });
				}
			}
		}));
	}

	private _createInitialAgent(): void {
		const initialAgent = this._createAgentInstance('Agent 1');
		this._agents.push(initialAgent);
		this._activeAgentId = initialAgent.id;
	}

	private _createAgentInstance(name: string): AgentInstance {
		const id = generateUuid();
		return {
			id,
			name,
			threadId: id, // Use agent ID as thread ID for uniqueness
			isActive: false,
			isRunning: false,
			createdAt: new Date(),
			lastActivity: new Date(),
		};
	}

	get agents(): AgentInstance[] {
		return [...this._agents];
	}

	get activeAgentId(): string | null {
		return this._activeAgentId;
	}

	createAgent(name?: string): AgentInstance {
		const agentNumber = this._agents.length + 1;
		const agentName = name || `Agent ${agentNumber}`;

		const newAgent = this._createAgentInstance(agentName);

		// Deactivate current active agent
		if (this._activeAgentId) {
			const currentAgent = this._agents.find(a => a.id === this._activeAgentId);
			if (currentAgent) {
				currentAgent.isActive = false;
			}
		}

		// Add and activate new agent
		newAgent.isActive = true;
		this._agents.push(newAgent);
		this._activeAgentId = newAgent.id;

		// Create a new thread for this agent
		this._chatThreadService.openNewThread();

		this._onDidChangeAgents.fire();
		this._onDidChangeActiveAgent.fire(newAgent.id);

		return newAgent;
	}

	removeAgent(agentId: string): boolean {
		const agentIndex = this._agents.findIndex(a => a.id === agentId);
		if (agentIndex === -1) {
			return false;
		}

		// Don't allow removing the last agent
		if (this._agents.length <= 1) {
			return false;
		}

		const removedAgent = this._agents[agentIndex];

		// Stop the agent if it's running
		if (removedAgent.isRunning) {
			this._chatThreadService.abortRunning(removedAgent.threadId);
		}

		// Remove the agent
		this._agents.splice(agentIndex, 1);

		// If we removed the active agent, switch to another one
		if (this._activeAgentId === agentId) {
			const newActiveAgent = this._agents[0] || null;
			if (newActiveAgent) {
				newActiveAgent.isActive = true;
				this._activeAgentId = newActiveAgent.id;
				this._chatThreadService.switchToThread(newActiveAgent.threadId);
			} else {
				this._activeAgentId = null;
			}
			this._onDidChangeActiveAgent.fire(this._activeAgentId);
		}

		this._onDidChangeAgents.fire();
		return true;
	}

	switchToAgent(agentId: string): boolean {
		const agent = this._agents.find(a => a.id === agentId);
		if (!agent) {
			return false;
		}

		// Deactivate current agent
		if (this._activeAgentId) {
			const currentAgent = this._agents.find(a => a.id === this._activeAgentId);
			if (currentAgent) {
				currentAgent.isActive = false;
			}
		}

		// Activate new agent
		agent.isActive = true;
		agent.lastActivity = new Date();
		this._activeAgentId = agentId;

		// Switch to the agent's thread
		this._chatThreadService.switchToThread(agent.threadId);

		this._onDidChangeActiveAgent.fire(agentId);
		return true;
	}

	getAgent(agentId: string): AgentInstance | undefined {
		return this._agents.find(a => a.id === agentId);
	}

	updateAgentStatus(agentId: string, isRunning: boolean): void {
		const agent = this._agents.find(a => a.id === agentId);
		if (agent && agent.isRunning !== isRunning) {
			agent.isRunning = isRunning;
			agent.lastActivity = new Date();
			this._onDidChangeAgentStatus.fire({ agentId, isRunning });
		}
	}

	renameAgent(agentId: string, newName: string): boolean {
		const agent = this._agents.find(a => a.id === agentId);
		if (!agent) {
			return false;
		}

		agent.name = newName;
		this._onDidChangeAgents.fire();
		return true;
	}

	removeAllAgents(): void {
		// Stop all running agents
		for (const agent of this._agents) {
			if (agent.isRunning) {
				this._chatThreadService.abortRunning(agent.threadId);
			}
		}

		// Clear all agents and create a new initial one
		this._agents = [];
		this._activeAgentId = null;
		this._createInitialAgent();

		this._onDidChangeAgents.fire();
		this._onDidChangeActiveAgent.fire(this._activeAgentId);
	}

	getRunningAgents(): AgentInstance[] {
		return this._agents.filter(a => a.isRunning);
	}

	async stopAllAgents(): Promise<void> {
		const runningAgents = this.getRunningAgents();

		const stopPromises = runningAgents.map(agent =>
			this._chatThreadService.abortRunning(agent.threadId)
		);

		await Promise.all(stopPromises);

		// Update agent statuses
		for (const agent of runningAgents) {
			agent.isRunning = false;
			agent.lastActivity = new Date();
		}

		this._onDidChangeAgents.fire();
	}
}

registerSingleton(IMultiAgentService, MultiAgentService, InstantiationType.Delayed);
export { IMultiAgentService };
