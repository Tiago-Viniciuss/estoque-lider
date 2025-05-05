import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, addDoc, getDoc, doc, query, orderBy, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Ajuste o caminho conforme necessário
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Ajuste o caminho conforme necessário
import '../styles/EntradaDeNotas.css'; // Importa o CSS refatorado

// --- Constantes e Configurações --- 
const EXPENSE_CATEGORIES = [
    { value: 'compra_mercadorias', label: 'Compra de Mercadorias' },
    { value: 'fornecedores', label: 'Fornecedores' },
    { value: 'servicos_contratados', label: 'Serviços Contratados' },
    { value: 'servicos_publicos', label: 'Serviços Públicos (Água, Luz, etc.)' },
    { value: 'impostos_taxas', label: 'Impostos e Taxas' },
    { value: 'aluguel', label: 'Aluguel' },
    { value: 'salarios_prolabore', label: 'Salários e Pró-labore' },
    { value: 'marketing_publicidade', label: 'Marketing e Publicidade' },
    { value: 'material_consumo', label: 'Material de Escritório / Consumo' },
    { value: 'transporte_frete', label: 'Transporte e Frete' },
    { value: 'sangria', label: 'Saída de Dinheiro / Sangria' }, // Categoria especial
    { value: 'outras', label: 'Outras Despesas' },
];

const SANGRIA_CATEGORY_VALUE = 'sangria';

const currentYear = new Date().getFullYear();
const YEARS_FOR_FILTER = Array.from({ length: 5 }, (_, i) => currentYear - i);
const MONTHS_FOR_FILTER = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

// --- Funções Utilitárias --- 
const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date.seconds ? date.seconds * 1000 : date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return 'R$ 0,00';
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- Componentes Filhos --- 

// Componente para exibir o resumo por categoria
const CategorySummary = ({ expenses }) => {
    // Calcula o total por categoria
    const categorySummary = useMemo(() => {
        const summary = {};
        let total = 0;
        
        // Inicializa todas as categorias com zero
        EXPENSE_CATEGORIES.forEach(cat => {
            summary[cat.value] = 0;
        });
        
        // Soma os valores por categoria
        expenses.forEach(expense => {
            const category = expense.category || 'outras';
            summary[category] = (summary[category] || 0) + (expense.value || 0);
            total += (expense.value || 0);
        });
        
        return { summary, total };
    }, [expenses]);
    
    // Filtra apenas categorias com valores > 0
    const categoriesToShow = useMemo(() => {
        return EXPENSE_CATEGORIES.filter(cat => 
            categorySummary.summary[cat.value] > 0
        );
    }, [categorySummary]);
    
    if (categoriesToShow.length === 0) {
        return null;
    }
    
    return (
        <div className="category-summary">
            <h3>Resumo por Categoria</h3>
            <table className="category-summary-table">
                <thead>
                    <tr>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    {categoriesToShow.map(cat => (
                        <tr key={cat.value}>
                            <td>{cat.label}</td>
                            <td className="value">{formatCurrency(categorySummary.summary[cat.value])}</td>
                            <td className="value">
                                {categorySummary.total > 0 
                                    ? ((categorySummary.summary[cat.value] / categorySummary.total) * 100).toFixed(1) + '%' 
                                    : '0%'}
                            </td>
                        </tr>
                    ))}
                    <tr>
                        <td><strong>Total</strong></td>
                        <td className="value"><strong>{formatCurrency(categorySummary.total)}</strong></td>
                        <td className="value"><strong>100%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const ExpenseForm = ({ onSave, loading, message, clearMessage }) => {
    const [formData, setFormData] = useState({
        date: formatDateForInput(new Date()), // Data atual por padrão
        category: '',
        description: '',
        value: '',
        justification: '', // Campo para sangria
    });
    const isSangria = formData.category === SANGRIA_CATEGORY_VALUE;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (message) clearMessage(); // Limpa mensagem ao digitar
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validação básica (será aprimorada no passo 004)
        if (!formData.date || !formData.category || !formData.description || !formData.value) {
            onSave(null, 'Preencha todos os campos obrigatórios.');
            return;
        }
        if (isSangria && !formData.justification) {
             onSave(null, 'Justificativa é obrigatória para Saída de Dinheiro/Sangria.');
            return;
        }

        const dataToSave = {
            date: formData.date,
            category: formData.category,
            description: formData.description,
            value: parseFloat(formData.value) || 0,
            justification: isSangria ? formData.justification : '',
            createdAt: new Date(), // Adiciona timestamp de criação
        };
        onSave(dataToSave);
        // Limpa o formulário após salvar (se o save for bem sucedido externamente)
        setFormData({
            date: formatDateForInput(new Date()), category: '', description: '', value: '', justification: '',
        });
    };

    return (
        <form onSubmit={handleSubmit} className="expense-form">
            <h2>Registrar Nova Despesa</h2>
            <div className="form-group">
                <label htmlFor="date">Data *</label>
                <input
                    type="date"
                    id="date"
                    name="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="category">Categoria *</label>
                <select
                    id="category"
                    name="category"
                    className="form-control"
                    value={formData.category}
                    onChange={handleChange}
                    required
                >
                    <option value="">-- Selecione --</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="description">Descrição *</label>
                <input
                    type="text"
                    id="description"
                    name="description"
                    className="form-control"
                    placeholder="Ex: Compra de canetas, Pagamento conta de luz"
                    value={formData.description}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="value">Valor (R$) *</label>
                <input
                    type="number"
                    id="value"
                    name="value"
                    className="form-control"
                    placeholder="0.00"
                    value={formData.value}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    required
                />
            </div>
            {isSangria && (
                <div className="form-group">
                    <label htmlFor="justification">Justificativa (Sangria) *</label>
                    <textarea
                        id="justification"
                        name="justification"
                        className="form-control"
                        placeholder="Motivo da retirada do dinheiro"
                        value={formData.justification}
                        onChange={handleChange}
                        required={isSangria}
                    />
                </div>
            )}

            {message && (
                <p className={`form-message ${message.type === 'error' ? 'error' : 'success'}`}>
                    {message.text}
                </p>
            )}

            <button type="submit" className="btn btn-submit" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrar Despesa'}
            </button>
        </form>
    );
};

const ExpenseListFilters = ({ filters, onFilterChange }) => {
    const handleInputChange = (e) => {
        onFilterChange({ ...filters, [e.target.name]: e.target.value });
    };

    const handleMonthYearChange = (e) => {
        // Ao mudar mês ou ano, limpa a data específica
        onFilterChange({ ...filters, [e.target.name]: e.target.value, specificDate: '' });
    };

     const handleDateChange = (e) => {
        // Ao mudar data específica, limpa mês e ano
        onFilterChange({ ...filters, specificDate: e.target.value, month: '', year: '' });
    };

    return (
        <div className="list-filters">
            <div className="filter-group">
                <label htmlFor="filterCategory">Categoria</label>
                <select
                    id="filterCategory"
                    name="category"
                    className="form-control"
                    value={filters.category}
                    onChange={handleInputChange}
                >
                    <option value="">Todas</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>
             <div className="filter-group">
                <label htmlFor="filterSearch">Buscar Descrição</label>
                <input
                    type="text"
                    id="filterSearch"
                    name="searchTerm"
                    className="form-control"
                    placeholder="Digite para buscar..."
                    value={filters.searchTerm}
                    onChange={handleInputChange}
                />
            </div>
            <div className="filter-group">
                <label htmlFor="filterDate">Data Específica</label>
                <input
                    type="date"
                    id="filterDate"
                    name="specificDate"
                    className="form-control"
                    value={filters.specificDate}
                    onChange={handleDateChange}
                />
            </div>
            <div className="filter-group">
                <label htmlFor="filterMonth">Mês</label>
                <select
                    id="filterMonth"
                    name="month"
                    className="form-control"
                    value={filters.month}
                    onChange={handleMonthYearChange}
                >
                    <option value="">Todos</option>
                    {MONTHS_FOR_FILTER.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>
            <div className="filter-group">
                <label htmlFor="filterYear">Ano</label>
                <select
                    id="filterYear"
                    name="year"
                    className="form-control"
                    value={filters.year}
                    onChange={handleMonthYearChange}
                >
                    <option value="">Todos</option>
                    {YEARS_FOR_FILTER.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
};

const ExpenseTable = ({ expenses, onSelect }) => {
    if (expenses.length === 0) {
        return <p className="no-expenses-message">Nenhuma despesa encontrada para os filtros selecionados.</p>;
    }

    const getCategoryLabel = (value) => {
        return EXPENSE_CATEGORIES.find(cat => cat.value === value)?.label || value;
    };

    return (
        <table className="expenses-table">
            <thead>
                <tr>
                    <th className="col-date">Data</th>
                    <th className="col-category">Categoria</th>
                    <th className="col-description">Descrição</th>
                    <th className="col-value">Valor</th>
                    <th className="col-actions">Ações</th>
                </tr>
            </thead>
            <tbody>
                {expenses.map((expense) => (
                    <tr key={expense.id}>
                        <td className="col-date">{formatDateForInput(expense.date)}</td>
                        <td className="col-category">{getCategoryLabel(expense.category)}</td>
                        <td className="col-description">{expense.description}</td>
                        <td className="col-value">{formatCurrency(expense.value)}</td>
                        <td className="col-actions">
                            <button onClick={() => onSelect(expense)} className="btn-details" title="Ver Detalhes">
                                <span className="material-symbols-outlined">visibility</span>
                            </button>
                            {/* Adicionar botões Editar/Excluir futuramente */}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const ExpenseDetailsModal = ({ expense, onClose }) => {
    if (!expense) return null;

    const getCategoryLabel = (value) => {
        return EXPENSE_CATEGORIES.find(cat => cat.value === value)?.label || value;
    };

    return (
        <div className="details-modal-overlay">
            <div className="details-modal-content">
                <button onClick={onClose} className="btn-close-modal material-symbols-outlined" title="Fechar">close</button>
                <h2>Detalhes da Despesa</h2>
                <p><strong>Data:</strong> {formatDateForInput(expense.date)}</p>
                <p><strong>Categoria:</strong> {getCategoryLabel(expense.category)}</p>
                <p><strong>Descrição:</strong> {expense.description}</p>
                <p><strong>Valor:</strong> {formatCurrency(expense.value)}</p>
                {expense.category === SANGRIA_CATEGORY_VALUE && expense.justification && (
                    <div className="justification">
                        <strong>Justificativa (Sangria):</strong>
                        <p>{expense.justification}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Componente Principal --- 

const EntradaDeNotas = () => {
    const [viewMode, setViewMode] = useState('form'); // 'form' or 'list'
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formMessage, setFormMessage] = useState(null); // { type: 'success'/'error', text: '...' }
    const [listError, setListError] = useState(null);
    const [filters, setFilters] = useState({
        category: '',
        searchTerm: '',
        specificDate: '',
        month: '',
        year: '',
    });
    const empresaId = localStorage.getItem('empresaId');

    const expensesRef = useMemo(() => {
        if (!empresaId) return null;
        return collection(db, `Empresas/${empresaId}/Despesas`);
    }, [empresaId]);

    // --- Funções de Busca e Manipulação de Dados --- 

    const fetchExpenses = useCallback(async () => {
        if (!expensesRef) {
            setListError("ID da empresa não encontrado.");
            return;
        }
        setLoading(true);
        setListError(null);
        try {
            // Ordenar por data descendente ao buscar
            const q = query(expensesRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(expensesData);
        } catch (err) {
            console.error("Erro ao buscar despesas:", err);
            setListError("Falha ao carregar despesas.");
        } finally {
            setLoading(false);
        }
    }, [expensesRef]);

    const handleSaveExpense = useCallback(async (dataToSave, errorMessage) => {
        if (errorMessage) {
            setFormMessage({ type: 'error', text: errorMessage });
            return;
        }
        if (!expensesRef) {
             setFormMessage({ type: 'error', text: 'Erro: ID da empresa não encontrado.' });
            return;
        }

        setLoading(true);
        setFormMessage(null);
        try {
            await addDoc(expensesRef, dataToSave);
            setFormMessage({ type: 'success', text: 'Despesa registrada com sucesso!' });
            // Opcional: Atualizar a lista imediatamente ou deixar para o próximo fetch
            // fetchExpenses(); 
        } catch (err) {
            console.error("Erro ao registrar despesa:", err);
            setFormMessage({ type: 'error', text: 'Falha ao registrar despesa. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    }, [expensesRef]);

    // --- Efeitos --- 

    // Busca inicial ao montar ou quando expensesRef muda
    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // Aplica filtros quando a lista original ou os filtros mudam
    useEffect(() => {
        let currentFiltered = [...expenses];

        if (filters.category) {
            currentFiltered = currentFiltered.filter(e => e.category === filters.category);
        }
        if (filters.searchTerm) {
            const termLower = filters.searchTerm.toLowerCase();
            currentFiltered = currentFiltered.filter(e => e.description.toLowerCase().includes(termLower));
        }
        if (filters.specificDate) {
             currentFiltered = currentFiltered.filter(e => formatDateForInput(e.date) === filters.specificDate);
        }
        else if (filters.month && filters.year) {
            const month = parseInt(filters.month);
            const year = parseInt(filters.year);
            currentFiltered = currentFiltered.filter(e => {
                const d = new Date(e.date.seconds ? e.date.seconds * 1000 : e.date);
                // Cuidado com timezone ao comparar datas
                const expenseDateUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                return expenseDateUTC.getUTCMonth() + 1 === month && expenseDateUTC.getUTCFullYear() === year;
            });
        }

        setFilteredExpenses(currentFiltered);
    }, [expenses, filters]);

    // --- Handlers de UI --- 

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleSelectExpense = (expense) => {
        setSelectedExpense(expense);
    };

    const handleCloseModal = () => {
        setSelectedExpense(null);
    };

    const clearFormMessage = () => {
        setFormMessage(null);
    };

    const toggleView = (mode) => {
        setViewMode(mode);
        if (mode === 'list' && expenses.length === 0) {
            fetchExpenses(); // Garante que busca se não houver dados
        }
        setFormMessage(null); // Limpa msg do form ao trocar de view
        setListError(null);
    };

    // --- Cálculo do Total --- 
    const totalFilteredValue = useMemo(() => {
        return filteredExpenses.reduce((sum, expense) => sum + (expense.value || 0), 0);
    }, [filteredExpenses]);

    // --- Renderização --- 

    if (!empresaId) {
        return <p>Erro: ID da empresa não encontrado. Por favor, faça login novamente.</p>;
    }

    return (
        <div className="expenses-container">
            <h1>Entrada de Notas / Despesas</h1>

            <div className="action-buttons">
                <button
                    onClick={() => toggleView('form')}
                    className={`btn ${viewMode === 'form' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Registrar Nova Despesa
                </button>
                <button
                    onClick={() => toggleView('list')}
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    Ver Lista de Despesas
                </button>
            </div>

            {viewMode === 'form' && (
                <ExpenseForm
                    onSave={handleSaveExpense}
                    loading={loading}
                    message={formMessage}
                    clearMessage={clearFormMessage}
                />
            )}

            {viewMode === 'list' && (
                <div className="expenses-list-section">
                    <h2>Lista de Despesas</h2>
                    <ExpenseListFilters filters={filters} onFilterChange={handleFilterChange} />

                    {listError && <p className="form-message error">{listError}</p>}

                    {loading && expenses.length === 0 ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            <div className="total-display">Total Filtrado: {formatCurrency(totalFilteredValue)}</div>
                            <ExpenseTable expenses={filteredExpenses} onSelect={handleSelectExpense} />
                            <CategorySummary expenses={filteredExpenses} />
                        </>
                    )}
                </div>
            )}

            <ExpenseDetailsModal expense={selectedExpense} onClose={handleCloseModal} />

        </div>
    );
};

export default EntradaDeNotas;

