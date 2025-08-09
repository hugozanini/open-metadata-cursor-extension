/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Custom Edge component inspired by OpenMetadata's curved edge implementation
 * https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-ui/src/main/resources/ui/src/components/Entity/EntityLineage/CustomEdge.component.tsx
 */

import React from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';

const CustomEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}) => {
    // Adjust connection points to account for the visual connection dots
    // Connection dots are positioned at -10px (left) and +10px (right) from node center
    const connectionDotOffset = 10;
    
    // Adjust source and target positions based on connection dot positions
    const adjustedSourceX = sourcePosition === Position.Right ? sourceX + connectionDotOffset : sourceX - connectionDotOffset;
    const adjustedTargetX = targetPosition === Position.Left ? targetX - connectionDotOffset : targetX + connectionDotOffset;
    
    // Create curved path using adjusted positions
    const [edgePath] = getBezierPath({
        sourceX: adjustedSourceX,
        sourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY,
        targetPosition,
    });

    // Improved edge styling for better visibility in both light and dark modes
    const edgeStyle = {
        stroke: 'var(--vscode-descriptionForeground)',
        strokeWidth: 2.5,
        opacity: 0.8,
        ...style,
    };

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={edgePath}
            style={edgeStyle}
            markerEnd={markerEnd}
        />
    );
};

export default CustomEdge;