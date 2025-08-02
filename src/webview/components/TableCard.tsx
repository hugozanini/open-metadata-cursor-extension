import React, { useState } from 'react';

interface TableResult {
    id: string;
    name: string;
    fullyQualifiedName: string;
    description?: string;
    tableType?: string;
    columns?: any[];
    rowCount?: number;
    database?: string;
    schema?: string;
    updatedAt?: string;
    tags?: string[];
    aiAnalysis?: string;
}

interface TableCardProps {
    table: TableResult;
}

export const TableCard: React.FC<TableCardProps> = ({ table }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [showAI, setShowAI] = useState(false);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    const formatNumber = (num?: number) => {
        if (num === undefined || num === null) return 'Unknown';
        return num.toLocaleString();
    };

    const getTableTypeIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'table': return '📊';
            case 'view': return '👁️';
            case 'external': return '🔗';
            default: return '📋';
        }
    };

    return (
        <div className="table-card">
            <div className="table-card-header">
                <div className="table-name-section">
                    <h4 className="table-name">
                        {getTableTypeIcon(table.tableType)} {table.name}
                    </h4>
                    <div className="table-path">
                        {table.database && <span className="database">{table.database}</span>}
                        {table.schema && <span className="schema">.{table.schema}</span>}
                        <span className="table-type">({table.tableType || 'table'})</span>
                    </div>
                </div>
                <div className="table-actions">
                    <button
                        className={`details-button ${showDetails ? 'active' : ''}`}
                        onClick={() => setShowDetails(!showDetails)}
                        title="Toggle details"
                    >
                        {showDetails ? '▼' : '▶'} Details
                    </button>
                    {table.aiAnalysis && (
                        <button
                            className={`ai-button ${showAI ? 'active' : ''}`}
                            onClick={() => setShowAI(!showAI)}
                            title="Toggle AI analysis"
                        >
                            🤖 AI
                        </button>
                    )}
                </div>
            </div>

            <div className="table-card-body">
                {table.description && (
                    <p className="table-description">{table.description}</p>
                )}

                <div className="table-stats">
                    <div className="stat-item">
                        <span className="stat-label">Rows:</span>
                        <span className="stat-value">{formatNumber(table.rowCount)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Columns:</span>
                        <span className="stat-value">{table.columns?.length || 'Unknown'}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Updated:</span>
                        <span className="stat-value">{formatDate(table.updatedAt)}</span>
                    </div>
                </div>

                {table.tags && table.tags.length > 0 && (
                    <div className="table-tags">
                        {table.tags.map((tag, index) => (
                            <span key={index} className="tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {showDetails && (
                    <div className="table-details">
                        <h5>📋 Column Details</h5>
                        {table.columns && table.columns.length > 0 ? (
                            <div className="columns-list">
                                {table.columns.slice(0, 10).map((column, index) => (
                                    <div key={index} className="column-item">
                                        <span className="column-name">{column.name}</span>
                                        <span className="column-type">{column.dataType || 'unknown'}</span>
                                        {column.description && (
                                            <span className="column-description">
                                                - {column.description}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {table.columns.length > 10 && (
                                    <div className="column-item more-columns">
                                        ... and {table.columns.length - 10} more columns
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="no-columns">No column information available</p>
                        )}
                    </div>
                )}

                {showAI && table.aiAnalysis && (
                    <div className="ai-analysis">
                        <h5>🤖 AI Analysis</h5>
                        <div className="ai-content">
                            {table.aiAnalysis.split('\n').map((line, index) => {
                                if (line.match(/^[📊⚠️💡🔗]/)) {
                                    return (
                                        <div key={index} className="ai-line highlighted">
                                            {line}
                                        </div>
                                    );
                                }
                                if (line.trim()) {
                                    return (
                                        <div key={index} className="ai-line">
                                            {line}
                                        </div>
                                    );
                                }
                                return <br key={index} />;
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};