import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/Balanço.css';
import LoadingSpinner from '../components/LoadingSpinner.jsx'

const Balanço = () => {
    const [listaProdutos, setListaProdutos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [balancoTotal, setBalancoTotal] = useState(0);
    const empresaId = localStorage.getItem('empresaId');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const productsRef = collection(db, `Empresas/${empresaId}/Produtos`);
            const productsSnapshot = await getDocs(productsRef);

            const productsData = [];
            let totalBalanco = 0;

            productsSnapshot.forEach((doc) => {
                const productData = doc.data();
                const valorTotalEstoque = productData.estoque * productData.preco;
                totalBalanco += valorTotalEstoque;
                productsData.push({ ...productData, valorTotalEstoque });
            });

            // Ordena os produtos por nome em ordem alfabética
            productsData.sort((a, b) => a.nome.localeCompare(b.nome));

            setListaProdutos(productsData);
            setBalancoTotal(totalBalanco);

        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchProducts();
    }, []);


    if (loading) {
        return (<LoadingSpinner />

        )
    }

    return (
        <div id='balanço'>
            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div className="tabela-balanco">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome do Produto</th>
                                <th>Preço Unitário</th>
                                <th>Quantidade em Estoque</th>
                                <th>Valor Total do Estoque</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaProdutos.map((produto) => (
                                <tr key={produto.nome}>
                                    <td>{produto.nome}</td>
                                    <td>R${produto.preco.toFixed(2)}</td>
                                    <td>{produto.estoque}</td>
                                    <td>R${produto.valorTotalEstoque.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="3"><strong>Total do Balanço</strong></td>
                                <td><strong>R${balancoTotal.toFixed(2)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Balanço;
