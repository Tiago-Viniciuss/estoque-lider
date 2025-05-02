import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const PaymentHistory = ({ empresaId, onTotalChange }) => {
    const [pagamentos, setPagamentos] = useState([]);
    const [filtro, setFiltro] = useState("hoje");
    const [dataEspecifica, setDataEspecifica] = useState("");

    useEffect(() => {
        const fetchPagamentos = async () => {
            const pagamentosRef = collection(db, `Empresas/${empresaId}/Pagamentos`);
            const now = new Date();
            let inicio;
            let fim = new Date();

            switch (filtro) {
                case "hoje":
                    inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "ontem":
                    inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "7dias":
                    inicio = new Date(now);
                    inicio.setDate(inicio.getDate() - 7);
                    break;
                case "30dias":
                    inicio = new Date(now);
                    inicio.setDate(inicio.getDate() - 30);
                    break;
                case "data":
                    if (!dataEspecifica) return;
                    inicio = new Date(dataEspecifica);
                    fim = new Date(dataEspecifica);
                    fim.setDate(fim.getDate() + 1);
                    break;
                default:
                    return;
            }

            const q = query(
                pagamentosRef,
                where("data", ">=", Timestamp.fromDate(inicio)),
                where("data", "<", Timestamp.fromDate(fim))
            );

            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPagamentos(results);

            // 👉 Calcula o total e chama o callback
            const total = results.reduce((acc, pagamento) => acc + (Number(pagamento.valor) || 0), 0);
            if (onTotalChange) {
                onTotalChange(total);
            }
        };

        fetchPagamentos();
    }, [filtro, dataEspecifica, empresaId, onTotalChange]);

    return (
        <div>
            <h2>Histórico de Pagamentos</h2>

            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="data">Por data específica</option>
            </select>

            {filtro === "data" && (
                <input
                    type="date"
                    value={dataEspecifica}
                    onChange={(e) => setDataEspecifica(e.target.value)}
                />
            )}

            <ul>
                {pagamentos.map((p) => (
                    <li key={p.id}>
                        <strong>{p.cliente}</strong> pagou R$ {p.valor.toFixed(2)} via {p.formaPagamento} em{" "}
                        {p.data.toDate().toLocaleString("pt-BR")}
                    </li>
                ))}
                {pagamentos.length === 0 && <p>Nenhum pagamento encontrado.</p>}
            </ul>
            <p>
                Total: R$ {pagamentos.reduce((acc, pagamento) => acc + (Number(pagamento.valor) || 0), 0).toFixed(2)}
            </p>
        </div>
    );
};

export default PaymentHistory;
