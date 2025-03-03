import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#0088FE", "#FF0000", "#FFBB28"];

const GraficoPizza = ({ vendasPagas, vendasFiado, vendasTotais }) => {
  // Definir os dados para o gráfico com base nas props
 
  const data = [
    { name: "Vendas Pagas", value: vendasPagas },
    { name: "Vendas Fiado", value: vendasFiado },
    { name: "Total de Vendas", value: vendasTotais }
  ];

  const formatValue = (value) => {
    return value.toFixed(2);
  };

  return (
    <PieChart width={400} height={400}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={100}
        fill="#8884d8"
        dataKey="value"
        label={(entry) => ` ${formatValue(entry.value)}`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
};

export default GraficoPizza;
