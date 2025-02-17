import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import '../styles/EditarProdutos.css'

const EditarProdutos = () => {
    const [productsList, setProductsList] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editingList, setEditingList] = useState(true);
    const [editingTool, setEditingTool] = useState(false);
    const [filterCategory, setFilterCategory] = useState('Todos');
    const [loading, setLoading] = useState(false)
    const empresaId = localStorage.getItem('empresaId');

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
                {['alimentos', 'bebidas', 'higiene', 'limpeza', 'utilidades', 'botijão','Todos'].map((category) => (
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
                                        {product.estoque} <span onClick={() => handleEdit(product)}  className='material-symbols-outlined'>edit</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {editingTool && selectedProduct && (
                    <form id="editingTool" onSubmit={handleUpdateProduct}>
                        <span onClick={ handleCloseEdit}  className='material-symbols-outlined'>close</span>
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
