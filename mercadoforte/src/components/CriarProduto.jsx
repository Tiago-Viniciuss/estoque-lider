import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/CriarProduto.css';

const CriarProduto = () => {
    const [productCategory, setProductCategory] = useState('');
    const [productName, setProductName] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [profitMargin, setProfitMargin] = useState(30);
    const [productPrice, setProductPrice] = useState('');
    const [stockQuantity, setStockQuantity] = useState('');
    const [productCode, setProductCode] = useState('');
    const [productImage, setProductImage] = useState(null);
    const [message, setMessage] = useState('');
    const [manualPriceEdit, setManualPriceEdit] = useState(false);
    const empresaId = localStorage.getItem('empresaId')

    // Atualiza o preço sugerido automaticamente ao alterar preço de custo ou margem
    useEffect(() => {
        if (!manualPriceEdit) {
            const cost = parseFloat(costPrice) || 0;
            const margin = parseFloat(profitMargin) || 0;
            const suggestedPrice = cost + (cost * margin / 100);
            setProductPrice(suggestedPrice.toFixed(2)); // Mantém 2 casas decimais
        }
    }, [costPrice, profitMargin, manualPriceEdit]);

    const handleCostPriceChange = (e) => {
        setCostPrice(e.target.value);
        setManualPriceEdit(false); // Se o usuário altera o preço de custo, recalcula automaticamente
    };

    const handleProfitMarginChange = (e) => {
        setProfitMargin(e.target.value);
        setManualPriceEdit(false);
    };

    const handleProductPriceChange = (e) => {
        setProductPrice(e.target.value);
        setManualPriceEdit(true); // Se o usuário edita manualmente, não recalcula automaticamente
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!productCategory || !productName || !productPrice || !stockQuantity || !productCode) {
            setMessage('Por favor, preencha todos os campos.');
            return;
        }

        const productExists = await getDoc(doc(db, `Empresas/${empresaId}/Produtos`, productCode));
        if (productExists.exists()) {
            setMessage('Erro: O código do produto já existe.');
            return;
        }

        try {
            await setDoc(doc(db, `Empresas/${empresaId}/Produtos`, productCode), {
                categoria: productCategory,
                nome: productName,
                margemLucro: profitMargin,
                precoCusto: costPrice,
                preco: parseFloat(productPrice),
                estoque: parseInt(stockQuantity, 10),
                codigo: productCode,
            });

            setMessage('Produto criado com sucesso!');
            setProductCategory('');
            setProductName('');
            setCostPrice('');
            setProfitMargin(30);
            setProductPrice('');
            setStockQuantity('');
            setProductCode('');
            setManualPriceEdit(false);
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            setMessage('Erro ao criar produto. Tente novamente.');
        }
    };

    return (
        <div>
            <section>
                <form id="createProduct" onSubmit={handleSubmit}>
                    <label htmlFor="productCategory">Categoria do Produto</label>
                    <select
                        id="productCategory"
                        className="form-control"
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                    >
                        <option value="">Selecione uma categoria</option>
                        <option value="alimentos">Alimentos</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="higiene">Higiene</option>
                        <option value="limpeza">Limpeza</option>
                        <option value="botijão">Botijão</option>
                        <option value="pagamento">Pagamento</option>
                        <option value="utilidades">Utilidades</option>
                    </select>

                    <label htmlFor="productName">Nome do Produto</label>
                    <input
                        type="text"
                        id="productName"
                        className="form-control"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                    />

                    <label htmlFor="CostPrice">Preço de Custo</label>
                    <input
                        type="number"
                        id="CostPrice"
                        className="form-control"
                        value={costPrice}
                        onChange={handleCostPriceChange}
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
                    />

                    <label htmlFor="stockQuantity">Quantidade em Estoque</label>
                    <input
                        type="number"
                        id="stockQuantity"
                        className="form-control"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                    />

                    <label htmlFor="productCode">Código do Produto</label>
                    <input
                        type="number"
                        id="productCode"
                        className="form-control"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                    />

                    <button className="btn btn-dark form-control" type="submit">
                        + CRIAR NOVO PRODUTO
                    </button>
                </form>
                {message && <p>{message}</p>}
            </section>
        </div>
    );
};

export default CriarProduto;
