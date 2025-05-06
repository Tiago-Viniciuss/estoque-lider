import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, setDoc, getDocs, collection, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Ajuste o caminho conforme necessário
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Ajuste o caminho conforme necessário
import '../styles/EditarProdutos.css'; // Importa o CSS refatorado

// --- Constantes --- 
const CATEGORIES = ['alimentos', 'bebidas', 'higiene', 'limpeza', 'utilidades', 'Todos'];
const DEFAULT_PROFIT_MARGIN = 30;

// --- Funções Utilitárias --- (Podem ser movidas para um arquivo utils.js)
const calculateSuggestedPrice = (cost, margin) => {
    const costNum = parseFloat(cost);
    const marginNum = parseFloat(margin);
    if (!isNaN(costNum) && !isNaN(marginNum)) {
        return (costNum + (costNum * marginNum / 100)).toFixed(2);
    }
    return '';
};

const generateKeywords = (name) => {
    if (!name) return [];
    const lowerCaseName = name.toLowerCase();
    const words = lowerCaseName.match(/\w+(\'\w+)?/g);
    return words || [];
};

// --- Componentes Filhos --- 

const ProductFilter = React.memo(({ currentCategory, onFilterChange, currentSearch, onSearchChange }) => {
    return (
        <div className="products-filter">
            <div className="category-filter">
                {CATEGORIES.map((category) => (
                    <button
                        key={category}
                        onClick={() => onFilterChange(category)}
                        className={`btn-category ${currentCategory === category ? 'active' : ''}`}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <input
                type="text"
                placeholder="Buscar produto por nome..."
                value={currentSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className='search-input form-control' // Adiciona form-control se quiser estilos do Bootstrap
            />
        </div>
    );
});

const ProductTable = React.memo(({ products, onEdit }) => {
    if (products.length === 0) {
        return <p>Nenhum produto encontrado.</p>;
    }

    return (
        <section className="products-list-section">
            <table className="products-table">
                <thead>
                    <tr>
                        <th className="product-name">Nome</th>
                        <th className="product-code">Código</th>
                        <th className="product-price">Preço</th>
                        <th className="product-stock">Estoque</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product.id} className={`product-item ${product.estoque < 10 ? 'low-stock-row' : ''}`}>
                            <td className={`product-name ${product.estoque < 10 ? 'low-stock' : ''}`} onClick={() => onEdit(product)}>{product.nome}</td>
                            <td className={`product-code ${product.estoque < 10 ? 'low-stock' : ''}`}>{product.codigo}</td>
                            <td className={`product-price ${product.estoque < 10 ? 'low-stock' : ''}`}>R$ {product.preco?.toFixed(2) ?? '0.00'}</td>
                            <td className={`product-stock ${product.estoque < 10 ? 'low-stock' : ''}`}>{product.estoque}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
});

const ProductEditForm = ({ product, onClose, onUpdate, onDelete, loading }) => {
    const [formData, setFormData] = useState({});
    const [profitMargin, setProfitMargin] = useState(DEFAULT_PROFIT_MARGIN);
    const [suggestedPrice, setSuggestedPrice] = useState('');
    const [manualPriceEdit, setManualPriceEdit] = useState(false);
    const empresaId = localStorage.getItem('empresaId'); // Necessário para delete

    useEffect(() => {
        if (product) {
            setFormData({
                categoria: product.categoria || '',
                nome: product.nome || '',
                preco: product.preco?.toFixed(2) ?? '',
                estoque: product.estoque ?? 0,
                codigo: product.codigo || '',
                precoCusto: product.precoCusto || '',
            });
            setProfitMargin(product.margemLucro ?? DEFAULT_PROFIT_MARGIN);
            setManualPriceEdit(false); // Reset manual edit flag on product change
        }
    }, [product]);

    useEffect(() => {
        if (!manualPriceEdit) {
            const price = calculateSuggestedPrice(formData.precoCusto, profitMargin);
            setSuggestedPrice(price);
            // Atualiza o preço final apenas se o preço sugerido for válido e diferente
            if (price !== '' && price !== formData.preco) {
                 setFormData(prev => ({ ...prev, preco: price }));
            }
        }
    }, [formData.precoCusto, profitMargin, manualPriceEdit, formData.preco]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'precoCusto') {
            setManualPriceEdit(false);
        }
        if (name === 'preco') {
            setManualPriceEdit(true);
        }
    };

    const handleProfitMarginChange = (e) => {
        const value = e.target.value;
        setProfitMargin(value);
        setManualPriceEdit(false);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!formData.categoria) {
            alert('Por favor, selecione uma categoria válida.');
            return;
        }

        const keywords = generateKeywords(formData.nome);

        const updatedProductData = {
            ...product, // Mantém outros campos não editáveis
            categoria: formData.categoria,
            nome: formData.nome,
            nomeMinusculo: formData.nome.toLowerCase(),
            preco: parseFloat(formData.preco) || 0,
            estoque: parseInt(formData.estoque) || 0,
            codigo: formData.codigo,
            precoCusto: parseFloat(formData.precoCusto) || 0,
            margemLucro: parseFloat(profitMargin) || 0,
            keywords: keywords,
            keywordsMinusculo: keywords.map(k => k.toLowerCase()),
        };
        onUpdate(product.id, updatedProductData);
    };

    const handleDelete = async () => {
        if (!product || !product.id || !empresaId) return;
        const confirmDelete = window.confirm(`Tem certeza que deseja excluir o produto "${product.nome}"?`);
        if (confirmDelete) {
            onDelete(product.id, product.nome); // Passa ID e nome para feedback
        }
    };

    if (!product) return null;

    return (
        <form className="edit-form-container" onSubmit={handleSubmit}>
            <button type="button" onClick={onClose} className='btn-close material-symbols-outlined' title="Fechar Edição">close</button>
            <h2>Editar Produto</h2>

            <div className="form-group">
                <label htmlFor="productCategory">Categoria</label>
                <select
                    name="categoria"
                    id="productCategory"
                    className="form-control"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                >
                    <option value="">Selecione...</option>
                    {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="productName">Nome</label>
                <input
                    type="text"
                    name="nome"
                    id="productName"
                    value={formData.nome}
                    onChange={handleChange}
                    className="form-control"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="productCode">Código</label>
                <input
                    type="text"
                    name="codigo"
                    id="productCode"
                    value={formData.codigo}
                    onChange={handleChange}
                    className="form-control"
                    // onKeyDown={...} // Manter se necessário
                />
            </div>

            <div className="form-group">
                <label htmlFor="costPrice">Preço de Custo</label>
                <input
                    type="number"
                    name="precoCusto"
                    id="costPrice"
                    value={formData.precoCusto}
                    onChange={handleChange}
                    className="form-control"
                    min="0"
                    step="0.01"
                />
            </div>

            <div className="form-group">
                <label htmlFor="profitMargin">Margem de Lucro (%)</label>
                <input
                    type="number"
                    id="profitMargin"
                    value={profitMargin}
                    onChange={handleProfitMarginChange}
                    className="form-control"
                    min="0"
                />
            </div>

            <div className="form-group">
                <label htmlFor="productPrice">Preço Unitário (Venda)</label>
                <input
                    type="number"
                    name="preco"
                    id="productPrice"
                    value={formData.preco}
                    onChange={handleChange}
                    className="form-control"
                    min="0"
                    step="0.01"
                    required
                />
                 {suggestedPrice && !manualPriceEdit && <small>Preço Sugerido: R$ {suggestedPrice}</small>}
            </div>

            <div className="form-group">
                <label htmlFor="stockQuantity">Estoque</label>
                <input
                    type="number"
                    name="estoque"
                    id="stockQuantity"
                    value={formData.estoque}
                    onChange={handleChange}
                    className="form-control"
                    min="0"
                />
            </div>

            <div className="form-actions">
                <button type="button" onClick={handleDelete} className="btn btn-danger" disabled={loading}>
                    {loading ? 'Excluindo...' : 'Excluir Produto'}
                </button>
                <button type="submit" className="btn btn-dark" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
};

// --- Componente Principal --- 

const EditarProdutos = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [filterCategory, setFilterCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const empresaId = localStorage.getItem('empresaId');

    const productsRef = useMemo(() => {
        if (!empresaId) return null;
        return collection(db, `Empresas/${empresaId}/Produtos`);
    }, [empresaId]);

    const fetchProducts = useCallback(async () => {
        if (!productsRef) {
            setError("ID da empresa não encontrado. Faça login novamente.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const snapshot = await getDocs(productsRef);
            const productsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            productsData.sort((a, b) => a.nome.localeCompare(b.nome));
            setAllProducts(productsData);
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
            setError('Falha ao carregar produtos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [productsRef]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        let currentFiltered = [...allProducts];

        // Filtrar por categoria
        if (filterCategory !== 'Todos') {
            currentFiltered = currentFiltered.filter(p => p.categoria === filterCategory);
        }

        // Filtrar por termo de busca
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            currentFiltered = currentFiltered.filter(p =>
                p.nome.toLowerCase().includes(searchLower) ||
                p.codigo?.toLowerCase().includes(searchLower) // Opcional: buscar por código também
            );
        }

        setFilteredProducts(currentFiltered);
    }, [allProducts, filterCategory, searchTerm]);

    const handleUpdateProduct = useCallback(async (productId, updatedData) => {
        if (!productsRef) return;
        setLoading(true);
        setError(null);
        try {
            const productRef = doc(db, `Empresas/${empresaId}/Produtos`, productId);
            await setDoc(productRef, updatedData, { merge: true });
            setSelectedProduct(null); // Fecha o formulário
            await fetchProducts(); // Rebusca produtos para garantir consistência
            alert('Produto atualizado com sucesso!');
        } catch (err) {
            console.error('Erro ao atualizar produto:', err);
            setError('Falha ao salvar alterações. Tente novamente.');
            setLoading(false); // Mantém loading se der erro para não fechar form
        }
        // setLoading(false) é chamado no finally do fetchProducts
    }, [productsRef, fetchProducts, empresaId]);

    const handleDeleteProduct = useCallback(async (productId, productName) => {
         if (!productsRef) return;
        setLoading(true);
        setError(null);
        try {
            const productRef = doc(db, `Empresas/${empresaId}/Produtos`, productId);
            await deleteDoc(productRef);
            setSelectedProduct(null); // Fecha o formulário
            // Atualiza estado localmente para resposta mais rápida
            setAllProducts(prev => prev.filter(p => p.id !== productId));
            alert(`Produto "${productName}" excluído com sucesso!`);
        } catch (err) {
            console.error('Erro ao excluir produto:', err);
            setError('Falha ao excluir produto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [productsRef, empresaId]);

    const handleSelectProductEdit = (product) => {
        setSelectedProduct(product);
    };

    const handleCloseEdit = () => {
        setSelectedProduct(null);
    };

    if (!empresaId) {
        return <p>Erro: ID da empresa não encontrado. Por favor, faça login novamente.</p>;
    }

    return (
        <div className='products-container'>
            <h1>Editar Produtos</h1>

            {error && <p style={{ color: 'red' }}>Erro: {error}</p>}

            {!selectedProduct ? (
                <>
                    <ProductFilter
                        currentCategory={filterCategory}
                        onFilterChange={setFilterCategory}
                        currentSearch={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                    {loading && allProducts.length === 0 ? (
                        <LoadingSpinner />
                    ) : (
                        <ProductTable products={filteredProducts} onEdit={handleSelectProductEdit} />
                    )}
                </>
            ) : (
                <ProductEditForm
                    product={selectedProduct}
                    onClose={handleCloseEdit}
                    onUpdate={handleUpdateProduct}
                    onDelete={handleDeleteProduct}
                    loading={loading}
                />
            )}
        </div>
    );
};

export default EditarProdutos;

