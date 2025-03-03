import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import '../styles/EditarProdutos.css'

const EditarProdutos = () => {
    const [productsList, setProductsList] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [costPrice, setCostPrice] = useState('');
    const [profitMargin, setProfitMargin] = useState(30);
    const [productPrice, setProductPrice] = useState('');
    const [editingList, setEditingList] = useState(true);
    const [editingTool, setEditingTool] = useState(false);
    const [filterCategory, setFilterCategory] = useState('Todos');
    const [loading, setLoading] = useState(false)
    const [manualPriceEdit, setManualPriceEdit] = useState(false);
    const empresaId = localStorage.getItem('empresaId');

    useEffect(() => {
        if (!manualPriceEdit && selectedProduct) {
            // Verifique se precoCusto é um número válido
            const cost = parseFloat(selectedProduct.precoCusto);
            const margin = parseFloat(profitMargin);

            // Verifique se ambos são números válidos
            if (!isNaN(cost) && !isNaN(margin)) {
                const suggestedPrice = cost + (cost * margin / 100);
                setProductPrice(suggestedPrice.toFixed(2)); // Mantém 2 casas decimais
            } else {
                setProductPrice(''); // Caso algum valor seja inválido, deixe o campo vazio
            }
        }
    }, [selectedProduct, profitMargin, manualPriceEdit]);


    const handleCostPriceChange = (e) => {
        const value = e.target.value;
        setCostPrice(value);

        // Verifique se o valor é um número válido
        const cost = parseFloat(value);
        if (isNaN(cost)) {
            setProductPrice(''); // Se o valor for inválido, limpa o preço sugerido
        } else {
            setManualPriceEdit(false); // Se o usuário altera o preço de custo, recalcula automaticamente
        }
    };

    const handleProfitMarginChange = (e) => {
        const value = e.target.value;
        setProfitMargin(value);

        // Verifique se o valor é um número válido
        const margin = parseFloat(value);
        if (isNaN(margin)) {
            setProductPrice(''); // Se o valor for inválido, limpa o preço sugerido
        } else {
            setManualPriceEdit(false); // Se o usuário altera a margem de lucro, recalcula automaticamente
        }
    };


    const handleProductPriceChange = (e) => {
        setProductPrice(e.target.value);
        setManualPriceEdit(true); // Se o usuário edita manualmente, não recalcula automaticamente
    };

    const fetchProducts = async () => {
        setLoading(true)
        try {
            const productsRef = collection(db, `Empresas/${empresaId}/Produtos`);
            const productsSnapshot = await getDocs(productsRef);
            const products = productsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            products.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordenar alfabeticamente
            setProductsList(products);
            setFilteredProducts(products); // Inicialmente, sem filtro
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            setLoading(false)
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Handle category filter

    const handleFilter = (category) => {
        setFilterCategory(category);
        if (category === 'Todos') {
            setFilteredProducts(productsList);
        } else {
            setFilteredProducts(
                productsList.filter((product) => product.categoria === category)
            );
        }
    };

    // Handle editing a product
    const handleEdit = (product) => {
        setSelectedProduct(product);
        setEditingList(false);
        setEditingTool(true);
    };

    const handleCloseEdit = () => {
        setEditingList(true);
        setEditingTool(false);
    };

    const generateKeywords = (name) => {
        const lowerCaseName = name.toLowerCase(); // Converte para minúsculas
        const words = lowerCaseName.match(/\w+('\w+)?/g); // Expressão regular para capturar palavras
        return words || []; // Retorna o array de palavras-chave
    };

    // Handle product update
    const handleUpdateProduct = async (event) => {
        event.preventDefault();

        if (!selectedProduct.categoria) {
            alert('Por favor, selecione uma categoria válida.');
            return;
        }




        const formData = new FormData(event.target);

        const keywords = generateKeywords(formData.get('productName'));

        const updatedProduct = {
            categoria: formData.get('productCategory'),
            nome: formData.get('productName'),
            nomeMinusculo: formData.get('productName').toLowerCase(),
            preco: parseFloat(formData.get('productPrice')),
            estoque: parseInt(formData.get('stockQuantity')),
            codigo: formData.get('productCode'),
            keywords: keywords,
            keywordsMinusculo: keywords.map((keyword) => keyword.toLowerCase()),
            margemLucro: profitMargin,
            precoCusto: Number(costPrice),
        };

        try {
            const productRef = doc(db, `Empresas/${empresaId}/Produtos`, selectedProduct.id);
            await setDoc(productRef, updatedProduct, { merge: true });
            setEditingTool(false);
            setEditingList(true);
            fetchProducts(); // Atualizar lista de produtos
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
        }
    };

    if (loading) {
        return (<LoadingSpinner />

        )
    }

    return (
        <div id='productsContainer'>
            <menu id="chooseCategory">
                {['alimentos', 'bebidas', 'higiene', 'limpeza', 'utilidades', 'botijão', 'Todos'].map((category) => (
                    <button
                        key={category}
                        onClick={() => handleFilter(category)}
                        style={{
                            backgroundColor: filterCategory === category ? 'black' : 'white',
                            color: filterCategory === category ? 'white' : 'black',
                            border: '1px solid black',
                            padding: '8px 8px',
                            cursor: 'pointer',
                        }}
                    >
                        {category}
                    </button>
                ))}
            </menu>

            <section id="productsEditing">
                {editingList && (
                    <table id="productsList">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Código</th>
                                <th className='priceTable'>Preço Unitário</th>
                                <th>Estoque</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    className="productItem"
                                >
                                    <td style={{ color: product.estoque < 10 ? 'red' : 'black' }}>{product.nome}</td>
                                    <td style={{ color: product.estoque < 10 ? 'red' : 'black' }} className='editProduct'>{product.codigo}</td>
                                    <td style={{ color: product.estoque < 10 ? 'red' : 'black' }}>{product.preco}</td>
                                    <td style={{ color: product.estoque < 10 ? 'red' : 'black' }} className='editProduct'>
                                        {product.estoque} <span onClick={() => handleEdit(product)} className='material-symbols-outlined'>edit</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {editingTool && selectedProduct && (
                    <form id="editingTool" onSubmit={handleUpdateProduct}>
                        <span onClick={handleCloseEdit} className='material-symbols-outlined'>close</span>
                        <label htmlFor="productCategory">Categoria do Produto</label>
                        <select
                            name="productCategory"
                            id="productCategory"
                            className="form-control"
                            value={selectedProduct?.categoria || ''}
                            onChange={(e) =>
                                setSelectedProduct({ ...selectedProduct, categoria: e.target.value })
                            }
                        >
                            <option value="">Selecione uma categoria</option>
                            <option value="alimentos">Alimentos</option>
                            <option value="bebidas">Bebidas</option>
                            <option value="higiene">Higiene</option>
                            <option value="limpeza">Limpeza</option>
                            <option value="utilidades">Utilidades</option>
                        </select>

                        <label htmlFor="productName">Nome do Produto</label>
                        <input
                            type="text"
                            name="productName"
                            id="productName"
                            defaultValue={selectedProduct.nome}
                            className="form-control"
                        />

                        <label htmlFor="CostPrice">Preço de Custo</label>
                        <input
                            type="number"
                            id="CostPrice"
                            className="form-control"
                            defaultValue={selectedProduct.precoCusto}
                            onChange={handleCostPriceChange}
                            min="0" // Adiciona um limite mínimo, caso deseje
                            step="0.01" // Permite decimais
                        />

                        <label htmlFor="profitMargin">Margem de Lucro (%)</label>
                        <input
                            type="number"
                            id="profitMargin"
                            className="form-control"
                            value={profitMargin}
                            onChange={handleProfitMarginChange}
                        />

                        <label htmlFor="productPrice">Preço Sugerido</label>
                        <input
                            type="number"
                            id="productPrice"
                            className="form-control"
                            value={productPrice}
                            onChange={handleProductPriceChange}
                            min="0" // Adiciona um limite mínimo, caso deseje
                            step="0.01" // Permite decimais
                        />


                        <label htmlFor="productPrice">Preço Unitário</label>
                        <input
                            type="number"
                            name="productPrice"
                            id="productPrice"
                            defaultValue={selectedProduct.preco || ''}
                            className="form-control"
                            step="0.01"
                            min="0"
                            required
                        />

                        <label htmlFor="stockQuantity">Quantidade em Estoque</label>
                        <input
                            type="number"
                            name="stockQuantity"
                            id="stockQuantity"
                            defaultValue={selectedProduct.estoque}
                            className="form-control"
                        />

                        <label htmlFor="productCode">Código do Produto</label>
                        <input
                            type="text"
                            name="productCode"
                            id="productCode"
                            defaultValue={selectedProduct.codigo}
                            className="form-control"
                        />

                        <button className="btn btn-dark form-control" type="submit">
                            ATUALIZAR PRODUTO
                        </button>
                    </form>
                )}
            </section>
        </div>
    );
};

export default EditarProdutos;
