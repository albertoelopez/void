# Multi-Agent Tabs Implementation for Void Editor

## Overview

This implementation adds support for running multiple AI agents in parallel through a tabbed interface in Void Editor. Users can now create, manage, and switch between multiple agent conversations simultaneously.

## Architecture

### 1. Core Components

#### `MultiAgentService` (`src/vs/workbench/contrib/void/browser/multiAgentService.ts`)
- **Purpose**: Manages multiple agent instances and their lifecycle
- **Key Features**:
  - Create/remove agent instances
  - Switch between active agents
  - Monitor agent running status
  - Batch operations (stop all, get running agents)
- **Integration**: Registered as a singleton service in VSCode's dependency injection system

#### `AgentTabManager` (`src/vs/workbench/contrib/void/browser/react/src2/sidebar-tsx/AgentTabManager.tsx`)
- **Purpose**: React component for the tabbed interface
- **Key Features**:
  - Tabbed navigation UI
  - Add/remove tab functionality
  - Visual indicators for running agents
  - Tab switching with click handlers
  - Responsive design with scrollable tabs

#### `useMultiAgent` Hook (`src/vs/workbench/contrib/void/browser/react/src2/sidebar-tsx/useMultiAgent.tsx`)
- **Purpose**: React hook to interface with the MultiAgentService
- **Key Features**:
  - Real-time state synchronization
  - Action dispatchers for agent operations
  - Loading states and error handling
  - Event-driven updates

### 2. Updated Components

#### `Sidebar.tsx`
- **Changes**: Integrated `AgentTabManager` as the main container
- **Layout**: Flex column layout with tabs at top and content below

#### `sidebarPane.ts`
- **Changes**: Added registration of `multiAgentService.js`

#### `styles.css`
- **Additions**: Comprehensive styling for tabs, animations, and responsive design

## Features

### Tab Management
- **Create New Tab**: Click the "+" button to add a new agent
- **Switch Tabs**: Click on any tab to switch to that agent
- **Close Tabs**: Click the "×" button to close individual agents (minimum 1 required)
- **Visual Indicators**:
  - Green dot: Agent is actively running
  - Gray dot: Agent is idle
  - Pulsing animation: Agent is processing

### Agent Isolation
- Each tab maintains its own:
  - Chat thread and message history
  - Active context and selections
  - Model settings and preferences
  - Tool execution state

### Concurrent Operations
- Multiple agents can run simultaneously
- Independent tool execution across agents
- Parallel LLM streaming
- Isolated error states

## Technical Details

### Service Integration
```typescript
// Service registration in void.contribution.ts
import './multiAgentService.js'

// Usage in React components
const multiAgent = useMultiAgent();
const { agents, activeAgentId, createAgent, switchToAgent } = multiAgent;
```

### State Management
- **Agent State**: Managed by `MultiAgentService`
- **UI State**: Local React state in `AgentTabManager`
- **Sync**: Event-driven updates through VSCode's event system

### Thread Management
- Each agent gets a unique thread ID
- `ChatThreadService` handles individual agent conversations
- Thread switching occurs automatically when switching agents

## User Experience

### Visual Design
- **Tab Bar**: Clean, horizontal tab navigation
- **Running Indicators**: Clear visual feedback for agent status
- **Responsive**: Tabs scroll horizontally when overflow occurs
- **Theme Integration**: Follows Void Editor's design system

### Keyboard Support
- Tabs are keyboard accessible
- Standard navigation patterns
- Focus management for screen readers

### Performance
- Lazy loading of inactive agent UI
- Efficient state updates through React optimization
- Background processing doesn't block UI

## API Reference

### MultiAgentService Interface
```typescript
interface IMultiAgentService {
  readonly agents: AgentInstance[];
  readonly activeAgentId: string | null;

  createAgent(name?: string): AgentInstance;
  removeAgent(agentId: string): boolean;
  switchToAgent(agentId: string): boolean;
  renameAgent(agentId: string, newName: string): boolean;

  stopAllAgents(): Promise<void>;
  getRunningAgents(): AgentInstance[];
}
```

### AgentInstance Type
```typescript
interface AgentInstance {
  id: string;
  name: string;
  threadId: string;
  isActive: boolean;
  isRunning: boolean;
  createdAt: Date;
  lastActivity: Date;
}
```

## Future Enhancements

### Planned Features
1. **Tab Reordering**: Drag and drop tab organization
2. **Tab Persistence**: Save/restore tab sessions
3. **Agent Templates**: Predefined agent configurations
4. **Tab Groups**: Organize related agents
5. **Agent Sharing**: Export/import agent conversations

### Performance Optimizations
1. **Virtual Scrolling**: For large numbers of tabs
2. **Memory Management**: Cleanup inactive agent resources
3. **Debounced Updates**: Reduce re-render frequency

### Advanced Features
1. **Agent Collaboration**: Cross-agent communication
2. **Workspace Integration**: Agent-specific workspaces
3. **Custom Agent Types**: Specialized agent behaviors

## Installation & Setup

The multi-agent tabs feature is automatically available after building the React components:

```bash
npm run buildreact
npm run watch
```

No additional configuration is required. The feature integrates seamlessly with existing Void Editor functionality.

## Troubleshooting

### Common Issues
1. **Tabs not appearing**: Ensure React build completed successfully
2. **Agent switching fails**: Check browser console for service registration errors
3. **Visual glitches**: Verify CSS compilation and theme variables

### Debug Mode
Enable verbose logging by setting:
```typescript
// In browser console
localStorage.setItem('void-debug-agents', 'true');
```

## Contributing

When extending the multi-agent system:

1. **Service Changes**: Update `IMultiAgentService` interface first
2. **UI Changes**: Follow existing component patterns in `AgentTabManager`
3. **State Changes**: Use proper event emission for cross-component updates
4. **Testing**: Verify tab switching, creation, and deletion scenarios

## Dependencies

- **VSCode Extension API**: For service registration and event handling
- **React**: For UI components and state management
- **Void Editor Core**: Integration with existing chat and tool systems

The implementation builds upon Void Editor's existing architecture without breaking changes to core functionality.
