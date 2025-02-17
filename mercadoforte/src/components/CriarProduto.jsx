import React, { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/CriarProduto.css';

const CriarProduto = () => {
    const [productCategory, setProductCategory] = useState('');
    const [productName, setProductName] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [stockQuantity, setStockQuantity] = useState('');
    const [productCode, setProductCode] = useState('');
    const [productImage, setProductImage] = useState(null); // Armazena a URL da imagem para pré-visualização
    const [message, setMessage] = useState('');
    const empresaId = localStorage.getItem('empresaId')

    // Função para gerar palavras-chave a partir do nome do produto
    const generateKeywords = (name) => {
        const lowerCaseName = name.toLowerCase(); // Converte para minúsculas
        const words = lowerCaseName.match(/\w+('\w+)?/g); // Expressão regular para capturar palavras
        return words || []; // Retorna o array de palavras-chave
    };

    // Função para verificar se o código do produto já existe
    const checkProductCodeExists = async (code) => {
        const productDoc = await getDoc(doc(db, `Empresas/${empresaId}/Produtos`, code));
        return productDoc.exists();
    };

    // Manipula a seleção da imagem e gera uma URL para pré-visualização
    const handleImageChange = (e) => {
        const file = e.target.files[0]; // Obtém o arquivo selecionado
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProductImage(event.target.result); // Define a URL da imagem
            };
            reader.readAsDataURL(file); // Lê o arquivo como uma URL base64
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!productCategory || !productName || !productPrice || !stockQuantity || !productCode) {
            setMessage('Por favor, preencha todos os campos.');
            return;
        }

        const keywords = generateKeywords(productName); // Gera palavras-chave

        // Verifica se o código do produto já existe
        const productExists = await checkProductCodeExists(productCode);
        if (productExists) {
            setMessage('Erro: O código do produto já existe. Tente um código diferente.');
            return;
        }

        try {
            await setDoc(doc(db, `Empresas/${empresaId}/Produtos`, productCode), {
                categoria: productCategory,
                nome: productName,
                nomeMinusculo: productName.toLowerCase(), // Armazena o nome em minúsculas
                preco: parseFloat(productPrice),
                estoque: parseInt(stockQuantity, 10),
                codigo: productCode,
                keywords: keywords, // Armazena as palavras-chave no Firestore
                keywordsMinusculo: keywords.map((keyword) => keyword.toLowerCase()), // Armazena as palavras-chave em minúsculas
                imagem: productImage, // Salva a URL base64 da imagem
            });
            setMessage('Produto criado com sucesso!');
            setProductCategory('');
            setProductName('');
            setProductPrice('');
            setStockQuantity('');
            setProductCode('');
            setProductImage(null);
        } catch (error) {
            console.error('Erro ao criar produto:', error);

            if (error.code === 'permission-denied') {
                setMessage('Permissão insuficiente. Verifique as regras do Firestore.');
            } else {
                setMessage('Erro ao criar produto. Tente novamente.');
            }
        }
    };

    return (
        <div>
            <section>
                <form id='createProduct' onSubmit={handleSubmit}>
                    <label htmlFor="productCategory">Categoria do Produto</label>
                    <select
                        name="productCategory"
                        id="productCategory"
                        className='form-control'
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

                    {/* Pré-visualização da imagem 
                    
                    <label htmlFor="productImage">Adicione uma foto</label>
                    <input type="file" name="productImage" id="productImage" onChange={handleImageChange} />


                    {productImage && (
                        <div id='productImagePreview'>
                            <img src={productImage} alt='Pré-visualização do produto' style={{ maxWidth: '100%', maxHeight: '200px' }} />
                        </div>
                    )}
                    */}

                    <label htmlFor="productName">Nome do Produto</label>
                    <input
                        type="text"
                        name="productName"
                        id="productName"
                        placeholder='Nome do produto'
                        className='form-control'
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                    />

                    <label htmlFor="productPrice">Preço Unitário</label>
                    <input
                        type="number"
                        name="productPrice"
                        id="productPrice"
                        placeholder='Preço do produto'
                        className='form-control'
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                    />

                    <label htmlFor="stockQuantity">Quantidade em Estoque</label>
                    <input
                        type="number"
                        name="stockQuantity"
                        id="stockQuantity"
                        placeholder='Quantidade em estoque'
                        className='form-control'
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                    />

                    <label htmlFor="productCode">Código do Produto</label>
                    <input
                        type="number"
                        name="productCode"
                        id="productCode"
                        placeholder='Código do produto'
                        className='form-control'
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                    />

                    <button className='btn btn-dark form-control' type="submit">
                        + CRIAR NOVO PRODUTO
                    </button>
                </form>
                {message && <p>{message}</p>}
            </section>
        </div>
    );
};

export default CriarProduto;
