'use client';

import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
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
import SellAssetNode from '@/components/SellAssetNode';
import ProjectedPortfolioNode from '@/components/ProjectedPortfolioNode';
import { fetchPrice } from '@/lib/fetchPrice';

const nodeTypes = {
  portfolio: PortfolioNode,
  rotate: RotateAssetNode,
  sell: SellAssetNode,
  projected: ProjectedPortfolioNode,
};

const PORTFOLIO_ID = 'portfolio-1';
const PROJECTED_ID = 'projected-1';
const STORAGE_KEY = 'folioli-state';

const defaultNodes = [
  {
    id: PORTFOLIO_ID,
    type: 'portfolio',
    position: { x: 100, y: 150 },
    data: { holdings: [] },
  },
];

function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return null;
}

function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export default function Home() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [holdings, setHoldings] = useState([]);
  const [rotations, setRotations] = useState({});
  const [rotationInputs, setRotationInputs] = useState({});
  const [rotationCount, setRotationCount] = useState(0);
  const [sells, setSells] = useState({});
  const [sellInputs, setSellInputs] = useState({});
  const [sellCount, setSellCount] = useState(0);

  const isInitialMount = useRef(true);

  // Refresh prices for all holdings
  const refreshPrices = useCallback(async (holdingsToRefresh) => {
    if (!holdingsToRefresh || holdingsToRefresh.length === 0) return holdingsToRefresh;

    const refreshed = await Promise.all(
      holdingsToRefresh.map(async (holding) => {
        // Don't refresh USD/CASH
        if (holding.ticker === 'USD' || holding.ticker === 'CASH') return holding;
        const { price, type } = await fetchPrice(holding.ticker);
        return {
          ...holding,
          price: price ?? holding.price,
          type: type !== 'unknown' ? type : holding.type,
          value: price ? price * holding.amount : holding.value,
        };
      })
    );
    return refreshed;
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    const loadAndRefresh = async () => {
      const saved = loadState();
      if (saved) {
        if (saved.nodes) setNodes(saved.nodes);
        if (saved.edges) setEdges(saved.edges);
        if (saved.rotationCount !== undefined) setRotationCount(saved.rotationCount);
        if (saved.sellCount !== undefined) setSellCount(saved.sellCount);

        // Load with stale prices first for immediate display
        if (saved.holdings) setHoldings(saved.holdings);
        if (saved.rotations) setRotations(saved.rotations);
        if (saved.rotationInputs) setRotationInputs(saved.rotationInputs);
        if (saved.sells) setSells(saved.sells);
        if (saved.sellInputs) setSellInputs(saved.sellInputs);

        setIsHydrated(true);

        // Refresh prices in background after initial render
        if (saved.holdings && saved.holdings.length > 0) {
          const refreshedHoldings = await refreshPrices(saved.holdings);
          setHoldings(refreshedHoldings);
        }

        // Refresh rotation input prices
        if (saved.rotationInputs && Object.keys(saved.rotationInputs).length > 0) {
          const refreshedInputs = {};
          for (const [nodeId, inputs] of Object.entries(saved.rotationInputs)) {
            if (inputs.toAsset) {
              const { price, type } = await fetchPrice(inputs.toAsset);
              refreshedInputs[nodeId] = {
                ...inputs,
                toPrice: price ?? inputs.toPrice,
                toType: type !== 'unknown' ? type : inputs.toType,
              };
            } else {
              refreshedInputs[nodeId] = inputs;
            }
          }
          setRotationInputs(refreshedInputs);
        }
      } else {
        setIsHydrated(true);
      }
    };

    loadAndRefresh();
  }, [setNodes, setEdges, refreshPrices]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Strip callbacks from nodes before saving
    const nodesToSave = nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {},
    }));

    saveState({
      nodes: nodesToSave,
      edges,
      holdings,
      rotations,
      rotationInputs,
      rotationCount,
      sells,
      sellInputs,
      sellCount,
    });
  }, [isHydrated, nodes, edges, holdings, rotations, rotationInputs, rotationCount, sells, sellInputs, sellCount]);

  // Check if projected node should exist
  const shouldHaveProjectedNode = useCallback((nodesList) => {
    return nodesList.some(n => n.type === 'rotate' || n.type === 'sell');
  }, []);

  // Handle node changes and clean up when nodes are deleted
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);

    // Check for deleted rotation nodes
    const deletedRotateIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('rotate-'))
      .map(change => change.id);

    // Check for deleted sell nodes
    const deletedSellIds = changes
      .filter(change => change.type === 'remove' && change.id.startsWith('sell-'))
      .map(change => change.id);

    if (deletedRotateIds.length > 0) {
      setRotations(prev => {
        const updated = { ...prev };
        deletedRotateIds.forEach(id => delete updated[id]);
        return updated;
      });
      setRotationInputs(prev => {
        const updated = { ...prev };
        deletedRotateIds.forEach(id => delete updated[id]);
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedRotateIds.includes(edge.source) && !deletedRotateIds.includes(edge.target)
      ));
    }

    if (deletedSellIds.length > 0) {
      setSells(prev => {
        const updated = { ...prev };
        deletedSellIds.forEach(id => delete updated[id]);
        return updated;
      });
      setSellInputs(prev => {
        const updated = { ...prev };
        deletedSellIds.forEach(id => delete updated[id]);
        return updated;
      });
      setEdges(prev => prev.filter(edge =>
        !deletedSellIds.includes(edge.source) && !deletedSellIds.includes(edge.target)
      ));
    }

    // Remove projected node if no more action nodes
    if (deletedRotateIds.length > 0 || deletedSellIds.length > 0) {
      setNodes(prev => {
        if (!shouldHaveProjectedNode(prev)) {
          return prev.filter(n => n.id !== PROJECTED_ID);
        }
        return prev;
      });
    }
  }, [onNodesChange, setEdges, setNodes, shouldHaveProjectedNode]);

  // Remove a rotation node
  const handleRemoveRotation = useCallback((nodeId) => {
    setNodes(prev => {
      const remaining = prev.filter(n => n.id !== nodeId);
      if (!shouldHaveProjectedNode(remaining)) {
        return remaining.filter(n => n.id !== PROJECTED_ID);
      }
      return remaining;
    });
    setEdges(prev => prev.filter(edge =>
      edge.source !== nodeId && edge.target !== nodeId
    ));
    setRotations(prev => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });
    setRotationInputs(prev => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });
  }, [setNodes, setEdges, shouldHaveProjectedNode]);

  // Remove a sell node
  const handleRemoveSell = useCallback((nodeId) => {
    setNodes(prev => {
      const remaining = prev.filter(n => n.id !== nodeId);
      if (!shouldHaveProjectedNode(remaining)) {
        return remaining.filter(n => n.id !== PROJECTED_ID);
      }
      return remaining;
    });
    setEdges(prev => prev.filter(edge =>
      edge.source !== nodeId && edge.target !== nodeId
    ));
    setSells(prev => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });
    setSellInputs(prev => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });
  }, [setNodes, setEdges, shouldHaveProjectedNode]);

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

  const handleRotationInputChange = useCallback((nodeId, inputs) => {
    setRotationInputs(prev => ({
      ...prev,
      [nodeId]: inputs,
    }));
  }, []);

  const handleSellChange = useCallback((nodeId, sell) => {
    setSells(prev => {
      if (sell === null) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [nodeId]: sell };
    });
  }, []);

  const handleSellInputChange = useCallback((nodeId, inputs) => {
    setSellInputs(prev => ({
      ...prev,
      [nodeId]: inputs,
    }));
  }, []);

  // Helper to ensure projected node exists
  const ensureProjectedNode = useCallback(() => {
    setNodes(prev => {
      if (prev.some(n => n.id === PROJECTED_ID)) {
        return prev;
      }
      return [...prev, {
        id: PROJECTED_ID,
        type: 'projected',
        position: { x: 900, y: 150 },
        data: {},
      }];
    });
  }, [setNodes]);

  const handleAddRotation = useCallback(() => {
    const newRotationId = `rotate-${rotationCount + 1}`;
    setRotationCount(prev => prev + 1);

    const actionNodes = nodes.filter(n => n.type === 'rotate' || n.type === 'sell');
    const yOffset = actionNodes.length * 180;

    setNodes(prev => {
      let newNodes = [...prev];
      newNodes.push({
        id: newRotationId,
        type: 'rotate',
        position: { x: 500, y: 50 + yOffset },
        data: {},
      });
      return newNodes;
    });

    ensureProjectedNode();

    setEdges(prev => {
      const newEdges = [...prev];
      newEdges.push({
        id: `edge-portfolio-${newRotationId}`,
        source: PORTFOLIO_ID,
        target: newRotationId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });
      newEdges.push({
        id: `edge-${newRotationId}-projected`,
        source: newRotationId,
        target: PROJECTED_ID,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#f97316' },
      });
      return newEdges;
    });
  }, [nodes, rotationCount, setNodes, setEdges, ensureProjectedNode]);

  const handleAddSell = useCallback(() => {
    const newSellId = `sell-${sellCount + 1}`;
    setSellCount(prev => prev + 1);

    const actionNodes = nodes.filter(n => n.type === 'rotate' || n.type === 'sell');
    const yOffset = actionNodes.length * 180;

    setNodes(prev => {
      let newNodes = [...prev];
      newNodes.push({
        id: newSellId,
        type: 'sell',
        position: { x: 500, y: 50 + yOffset },
        data: {},
      });
      return newNodes;
    });

    ensureProjectedNode();

    setEdges(prev => {
      const newEdges = [...prev];
      newEdges.push({
        id: `edge-portfolio-${newSellId}`,
        source: PORTFOLIO_ID,
        target: newSellId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#3b82f6' },
      });
      newEdges.push({
        id: `edge-${newSellId}-projected`,
        source: newSellId,
        target: PROJECTED_ID,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#ef4444' },
      });
      return newEdges;
    });
  }, [nodes, sellCount, setNodes, setEdges, ensureProjectedNode]);

  // Calculate projected holdings based on all rotations and sells
  const projectedHoldings = useMemo(() => {
    const projected = holdings.map(h => ({ ...h }));
    let totalCash = 0;

    // Apply each rotation
    Object.values(rotations).forEach(rotation => {
      if (!rotation) return;

      const { fromAsset, sellAmount, toAsset, toPrice, toType, buyAmount } = rotation;

      const fromIndex = projected.findIndex(h => h.ticker === fromAsset);
      if (fromIndex !== -1) {
        projected[fromIndex].amount -= sellAmount;
        projected[fromIndex].value = projected[fromIndex].amount * (projected[fromIndex].price || 0);
        if (projected[fromIndex].amount <= 0.000001) {
          projected.splice(fromIndex, 1);
        }
      }

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

    // Apply each sell (convert to cash)
    Object.values(sells).forEach(sell => {
      if (!sell) return;

      const { fromAsset, sellAmount, sellValue } = sell;

      const fromIndex = projected.findIndex(h => h.ticker === fromAsset);
      if (fromIndex !== -1) {
        projected[fromIndex].amount -= sellAmount;
        projected[fromIndex].value = projected[fromIndex].amount * (projected[fromIndex].price || 0);
        if (projected[fromIndex].amount <= 0.000001) {
          projected.splice(fromIndex, 1);
        }
      }

      totalCash += sellValue;
    });

    // Add cash if any
    if (totalCash > 0) {
      const cashIndex = projected.findIndex(h => h.ticker === 'USD');
      if (cashIndex !== -1) {
        projected[cashIndex].amount += totalCash;
        projected[cashIndex].value = projected[cashIndex].amount;
      } else {
        projected.push({
          ticker: 'USD',
          amount: totalCash,
          price: 1,
          type: 'cash',
          value: totalCash,
        });
      }
    }

    return projected.sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [holdings, rotations, sells]);

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
            onAddSell: handleAddSell,
          },
        };
      }
      if (node.type === 'rotate') {
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            savedInputs: rotationInputs[node.id],
            onRotationChange: handleRotationChange,
            onInputChange: handleRotationInputChange,
            onRemove: handleRemoveRotation,
          },
        };
      }
      if (node.type === 'sell') {
        return {
          ...node,
          data: {
            ...node.data,
            holdings,
            savedInputs: sellInputs[node.id],
            onSellChange: handleSellChange,
            onInputChange: handleSellInputChange,
            onRemove: handleRemoveSell,
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
  }, [nodes, holdings, rotationInputs, sellInputs, projectedHoldings, handleHoldingsChange, handleAddRotation, handleAddSell, handleRotationChange, handleRotationInputChange, handleRemoveRotation, handleSellChange, handleSellInputChange, handleRemoveSell]);

  if (!isHydrated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

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
