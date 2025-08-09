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
    onViewLineage?: (tableFqn: string, tableName: string) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onViewLineage }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const [showAllColumns, setShowAllColumns] = useState(false);

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
        <div className="table-card-compact">
            <div className="table-card-main">
                <div className="table-info">
                    <div className="table-name-compact">
                        <span className="table-icon">{getTableTypeIcon(table.tableType)}</span>
                        <span className="table-name-text">{table.name}</span>
                        <span className="table-path-compact">
                            {table.database && <span className="database">{table.database}</span>}
                            {table.schema && <span className="schema">.{table.schema}</span>}
                        </span>
                    </div>
                    {table.description && (
                        <div className="table-description-compact">{table.description}</div>
                    )}
                </div>
                
                <div className="table-actions-compact">
                    {onViewLineage && (
                        <button
                            className="action-button lineage"
                            onClick={() => onViewLineage(table.fullyQualifiedName, table.name)}
                            title="View data lineage"
                        >
                            🔗 Lineage
                        </button>
                    )}
                    <button
                        className={`action-button details ${showDetails ? 'active' : ''}`}
                        onClick={() => setShowDetails(!showDetails)}
                        title="Toggle details"
                    >
                        ▼ Details
                    </button>
                </div>
            </div>

            <div className="table-metadata-compact">
                <div className="metadata-item">
                    <span className="metadata-value">{formatNumber(table.rowCount)}</span>
                    <span className="metadata-label">rows</span>
                </div>
                <div className="metadata-separator">•</div>
                <div className="metadata-item">
                    <span className="metadata-value">{table.columns?.length || '?'}</span>
                    <span className="metadata-label">cols</span>
                </div>
                <div className="metadata-separator">•</div>
                <div className="metadata-item">
                    <span className="metadata-value">{formatDate(table.updatedAt)}</span>
                </div>
                {table.tags && table.tags.length > 0 && (
                    <>
                        <div className="metadata-separator">•</div>
                        <div className="table-tags-compact">
                            {table.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="tag-compact">
                                    {tag}
                                </span>
                            ))}
                            {table.tags.length > 2 && (
                                <span className="tag-compact more">+{table.tags.length - 2}</span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showDetails && (
                <div className="table-details-compact">
                    {table.columns && table.columns.length > 0 ? (
                        <div className="columns-grid">
                            {(showAllColumns ? table.columns : table.columns.slice(0, 8)).map((column, index) => (
                                <div 
                                    key={index} 
                                    className="column-item-compact"
                                    title={column.description || `${column.name} (${column.dataType || 'unknown'})`}
                                >
                                    <span className="column-name-compact">{column.name}</span>
                                    <span className="column-type-compact">{column.dataType || 'unknown'}</span>
                                </div>
                            ))}
                            {!showAllColumns && table.columns.length > 8 && (
                                <div 
                                    className="column-item-compact more-columns-compact clickable"
                                    onClick={() => setShowAllColumns(true)}
                                    title="Click to show all columns"
                                >
                                    +{table.columns.length - 8} more
                                </div>
                            )}
                            {showAllColumns && table.columns.length > 8 && (
                                <div 
                                    className="column-item-compact less-columns-compact clickable"
                                    onClick={() => setShowAllColumns(false)}
                                    title="Click to show fewer columns"
                                >
                                    Show less
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-columns-compact">No column information available</div>
                    )}
                </div>
            )}

            {showAI && table.aiAnalysis && (
                <div className="ai-analysis-compact">
                    <div className="ai-content-compact">
                        {table.aiAnalysis.split('\n').map((line, index) => {
                            if (line.match(/^[📊⚠️💡🔗]/)) {
                                return (
                                    <div key={index} className="ai-line-compact highlighted">
                                        {line}
                                    </div>
                                );
                            }
                            if (line.trim()) {
                                return (
                                    <div key={index} className="ai-line-compact">
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
    );
};