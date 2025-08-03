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
import { EdgeProps, getBezierPath } from 'reactflow';

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
    // Create curved path using getBezierPath (like OpenMetadata)
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // OpenMetadata-style edge styling
    const edgeStyle = {
        stroke: 'var(--vscode-panel-border)',
        strokeWidth: 1.5,
        opacity: 1,
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