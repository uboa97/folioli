'use client';

import { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PortfolioNode from '@/components/PortfolioNode';
import RotateAssetNode from '@/components/RotateAssetNode';
import ProjectedPortfolioNode from '@/components/ProjectedPortfolioNode';

const nodeTypes = {
  portfolio: PortfolioNode,
  rotate: RotateAssetNode,
  projected: ProjectedPortfolioNode,
};

const PORTFOLIO_ID = 'portfolio-1';
const PROJECTED_ID = 'projected-1';

const initialNodes = [
  {
    id: PORTFOLIO_ID,
    type: 'portfolio',
    position: { x: 100, y: 150 },
    data: { holdings: [] },
  },
];

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [holdings, setHoldings] = useState([]);
  const [rotations, setRotations] = useState({});
  const [rotationCount, setRotationCount] = useState(0);

  // Handle node changes and clean up rotations when nodes are deleted
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);

    // Check for deleted rotation nodes
    const deletedRotateIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('rotate-'))
      .map(change => change.id);

    if (deletedRotateIds.length > 0) {
      // Clean up rotation data
      setRotations(prev => {
        const updated = { ...prev };
        deletedRotateIds.forEach(id => delete updated[id]);
        return updated;
      });

      // Remove edges connected to deleted nodes
      setEdges(prev => prev.filter(edge =>
        !deletedRotateIds.includes(edge.source) && !deletedRotateIds.includes(edge.target)
      ));

      // Check if we need to remove the projected node (no more rotation nodes)
      setNodes(prev => {
        const remainingRotateNodes = prev.filter(
          n => n.type === 'rotate' && !deletedRotateIds.includes(n.id)
        );
        if (remainingRotateNodes.length === 0) {
          return prev.filter(n => n.id !== PROJECTED_ID);
        }
        return prev;
      });
    }
  }, [onNodesChange, setEdges, setNodes]);

  // Remove a rotation node
  const handleRemoveRotation = useCallback((nodeId) => {
    // Remove the node
    setNodes(prev => {
      const remaining = prev.filter(n => n.id !== nodeId);
      const remainingRotateNodes = remaining.filter(n => n.type === 'rotate');

      // If no more rotation nodes, also remove projected node
      if (remainingRotateNodes.length === 0) {
        return remaining.filter(n => n.id !== PROJECTED_ID);
      }
      return remaining;
    });

    // Remove associated edges
    setEdges(prev => prev.filter(edge =>
      edge.source !== nodeId && edge.target !== nodeId
    ));

    // Clean up rotation data
    setRotations(prev => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });
  }, [setNodes, setEdges]);

  const handleHoldingsChange = useCallback((nodeId, newHoldings) => {
    setHoldings(newHoldings);
  }, []);

  const handleRotationChange = useCallback((nodeId, rotation) => {
    setRotations(prev => {
      if (rotation === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: rotation };
    });
  }, []);

  const handleAddRotation = useCallback(() => {
    const newRotationId = `rotate-${rotationCount + 1}`;
    setRotationCount(prev => prev + 1);

    const rotateNodes = nodes.filter(n => n.type === 'rotate');
    const yOffset = rotateNodes.length * 180;

    const hasProjectedNode = nodes.some(n => n.id === PROJECTED_ID);

    setNodes(prev => {
      let newNodes = [...prev];

      // Add rotation node
      const newRotateNode = {
        id: newRotationId,
        type: 'rotate',
        position: { x: 500, y: 50 + yOffset },
        data: {},
      };
      newNodes.push(newRotateNode);

      // Add projected node if it doesn't exist
      if (!hasProjectedNode) {
        const projectedNode = {
          id: PROJECTED_ID,
          type: 'projected',
          position: { x: 900, y: 150 },
          data: {},
        };
        newNodes.push(projectedNode);
      }

      return newNodes;
    });

    // Add edges
    setEdges(prev => {
      const newEdges = [...prev];

      // Edge from portfolio to rotation
      newEdges.push({
        id: `edge-portfolio-${newRotationId}`,
        source: PORTFOLIO_ID,
        target: newRotationId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });

      // Edge from rotation to projected
      newEdges.push({
        id: `edge-${newRotationId}-projected`,
        source: newRotationId,
        target: PROJECTED_ID,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#f97316' },
      });

      return newEdges;
    });
  }, [nodes, rotationCount, setNodes, setEdges]);

  // Calculate projected holdings based on all rotations
  const projectedHoldings = useMemo(() => {
    // Start with a copy of current holdings
    const projected = holdings.map(h => ({ ...h }));

    // Apply each rotation
    Object.values(rotations).forEach(rotation => {
      if (!rotation) return;

      const { fromAsset, sellAmount, toAsset, toPrice, toType, buyAmount } = rotation;

      // Reduce the from asset
      const fromIndex = projected.findIndex(h => h.ticker === fromAsset);
      if (fromIndex !== -1) {
        projected[fromIndex].amount -= sellAmount;
        projected[fromIndex].value = projected[fromIndex].amount * (projected[fromIndex].price || 0);

        // Remove if amount is 0 or negative
        if (projected[fromIndex].amount <= 0.000001) {
          projected.splice(fromIndex, 1);
        }
      }

      // Add or increase the to asset
      const toIndex = projected.findIndex(h => h.ticker === toAsset);
      if (toIndex !== -1) {
        projected[toIndex].amount += buyAmount;
        projected[toIndex].value = projected[toIndex].amount * (projected[toIndex].price || 0);
      } else {
        projected.push({
          ticker: toAsset,
          amount: buyAmount,
          price: toPrice,
          type: toType,
          value: buyAmount * toPrice,
        });
      }
    });

    // Sort by value descending
    return projected.sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [holdings, rotations]);

  // Inject data and callbacks into nodes
  const nodesWithData = useMemo(() => {
    return nodes.map(node => {
      if (node.type === 'portfolio') {
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            onHoldingsChange: handleHoldingsChange,
            onAddRotation: handleAddRotation,
          },
        };
      }
      if (node.type === 'rotate') {
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            onRotationChange: handleRotationChange,
            onRemove: handleRemoveRotation,
          },
        };
      }
      if (node.type === 'projected') {
        return {
          ...node,
          data: {
            ...node.data,
            projectedHoldings,
            originalHoldings: holdings,
          },
        };
      }
      return node;
    });
  }, [nodes, holdings, projectedHoldings, handleHoldingsChange, handleAddRotation, handleRotationChange, handleRemoveRotation]);

  return (
    <div className="w-screen h-screen">
      <ReactFlow
        nodes={nodesWithData}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#2d2d2d" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
