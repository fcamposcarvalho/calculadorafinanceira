# Calculadora Financeira

Uma calculadora avançada de fluxo de caixa para realizar cálculos financeiros como valor presente (VP), valor futuro (VF), parcelas (PMT), taxas de juros e períodos.

![Calculadora Financeira](https://github.com/fcamposcarvalho/calculadorafinanceira/raw/main/calculadorafinanceira.png)

## Funcionalidades

- **Cálculo completo de fluxo de caixa**:
  - Valor Presente (VP)
  - Valor Futuro (VF)
  - Parcelas (PMT)
  - Taxa de juros (i)
  - Número de períodos (n)
- **Inversão de sinal automática** para manter a coerência financeira
- **Cache de resultados** para melhorar o desempenho
- **Histórico de cálculos** com capacidade para os últimos 10 cálculos
- **Métodos numéricos avançados** como Newton-Raphson para o cálculo de taxas
- **Interface responsiva** adaptada a todos os tamanhos de tela
- **Tratamento de casos especiais** em diversos cenários financeiros
- **TIR (Taxa Interna de Retorno)** com múltiplos fluxos de caixa
- **TIRM (Taxa Interna de Retorno Modificada)** com taxas de financiamento e reinvestimento
- **VPL (Valor Presente Líquido)** com taxas de desconto ajustáveis
- **Modo RPN** (Notação Polonesa Reversa) para cálculos estilo HP
- **Tabelas de amortização** com métodos PRICE e SAC

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Técnicas modernas de UI/UX
- Métodos matemáticos financeiros

## Como Usar

### Instalação

1. Clone este repositório:
```bash
git clone https://github.com/fcamposcarvalho/calculadorafinanceira.git
```
2. Abra o arquivo `index.html` em qualquer navegador moderno

### Uso Online

Acesse a calculadora diretamente em: [https://fcamposcarvalho.github.io/calculadorafinanceira](https://fcamposcarvalho.github.io/calculadorafinanceira)

### Integração em Outros Sites

Para adicionar esta calculadora ao seu site:

1. Copie o arquivo `index.html`
2. Copie todos os arquivos `.css` (calculadora.css, calculadora_irr.css, calculadora_mirr.css, calculadora_npv.css)
3. Copie todos os arquivos `.js` (calculadorafinanceira.js, calculadora.js, calculadora_irr.js, calculadora_mirr.js, calculadora_npv.js)

## Guia de Uso

1. **Selecione o valor a calcular** no menu suspenso
2. **Preencha os campos conhecidos**
3. **Clique em "Calcular"** para obter o resultado
4. Use os botões **+/-** para inverter os sinais quando necessário
5. Visualize o **histórico de cálculos** clicando no botão "Histórico"
6. Acesse funções avançadas via botões **TIR**, **TIRM** ou **VPL**

## Casos de Uso Comuns

### Calculando Parcelas de Empréstimo
- Insira o Valor Presente com o valor do empréstimo (positivo)
- Defina o número de períodos
- Defina a taxa de juros
- Defina o Valor Futuro = 0
- Selecione "Pagamento (PMT)" no menu suspenso
- Calcule

### Calculando Tempo de Acumulação
- Insira o Valor Presente (investimento inicial)
- Insira a taxa de juros
- Insira o valor do aporte periódico (PMT)
- Insira o valor futuro desejado
- Selecione "Períodos (n)" no menu suspenso
- Calcule

### Calculando TIR (Taxa Interna de Retorno)
- Clique no botão "TIR"
- Insira o investimento inicial (negativo)
- Adicione linhas de fluxo de caixa para cada período
- Clique em "Calcular TIR"

## Fundamentos Matemáticos

A calculadora implementa as seguintes fórmulas financeiras:

- **Valor Presente (VP)**:
  - Com PMT=0: `VP = VF / (1+i)^n`
  - Caso geral: `VP = -PMT * (1-(1+i)^-n)/i - VF*(1+i)^-n`

- **Valor Futuro (VF)**:
  - Com PMT=0: `VF = VP * (1+i)^n`
  - Caso geral: `VF = -PMT * ((1+i)^n-1)/i - VP*(1+i)^n`

- **Métodos Numéricos**:
  - Busca Binária para o cálculo de períodos
  - Newton-Raphson para o cálculo de taxas

## Estrutura do Projeto

```
calculadorafinanceira/
│
├── index.html              # Arquivo HTML principal
├── calculadorafinanceira.js # Lógica principal de cálculos financeiros
├── calculadora.js          # Calculadora com modos ALG e RPN
├── calculadora_irr.js      # Módulo TIR (Taxa Interna de Retorno)
├── calculadora_mirr.js     # Módulo TIRM (TIR Modificada)
├── calculadora_npv.js      # Módulo VPL (Valor Presente Líquido)
├── calculadora.css         # Estilização CSS principal
├── calculadora_irr.css     # Estilização do modal TIR
├── calculadora_mirr.css    # Estilização do modal TIRM
├── calculadora_npv.css     # Estilização do modal VPL
├── calculadorafinanceira.png # Captura de tela da calculadora
└── README.md               # Este arquivo
```

## Melhorias Futuras

- [ ] Adição de gráficos para visualização
- [ ] Exportação de resultados em PDF
- [ ] Implementação de funções financeiras adicionais
- [ ] Temas visuais personalizáveis

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Créditos

Originalmente desenvolvido para o site [Cabala e Matemática](https://cabalaematematica.com.br/) como uma ferramenta educacional e prática para cálculos financeiros.

## Contribuições

Contribuições são bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua funcionalidade (`git checkout -b feature/nova-feature`)
3. Faça o commit das alterações (`git commit -am 'Adiciona nova feature'`)
4. Envie para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

© 2025 Calculadora Financeira | Todos os direitos reservados.