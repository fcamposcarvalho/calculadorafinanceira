# Calculadora Financeira

Uma calculadora avançada de fluxo de caixa para realizar cálculos financeiros como valor presente (VP), valor futuro (VF), parcelas (PMT), taxas de juros e períodos.

![Calculadora Financeira](https://github.com/fcamposcarvalho/financialcalculator//raw/main/financialcalculator.png)

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

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Técnicas modernas de UI/UX
- Métodos matemáticos financeiros

## Como Usar

### Instalação

1. Clone este repositório:
```
git clone https://github.com/your-user/financecalculator.git
```
2. Abra o arquivo `index.html` em qualquer navegador moderno

### Uso Online

Acesse a calculadora diretamente em: [https://fcamposcarvalho.github.io/financialcalculator](https://fcamposcarvalho.github.io/financialcalculator)

### Integração em Outros Sites

Para adicionar esta calculadora ao seu site:

1. Copie o arquivo `index.html`
2. Copie o arquivo `calculator.css`
3. Copie o arquivo `calculator.js`

## Guia de Uso

1. **Selecione o valor a calcular** no menu suspenso
2. **Preencha os campos conhecidos**
3. **Clique em "Calcular"** para obter o resultado
4. Use os botões **+/-** para inverter os sinais quando necessário
5. Visualize o **histórico de cálculos** clicando no botão "Histórico"

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
financialcalculator/
│
├── index.html # Arquivo principal contendo HTML, CSS e JavaScript
├── calculator.css # Arquivo de formatação CSS
├── calculator.js # Arquivo Javascript para execução, validação, mensagens, ...
├── financialcalculator.png # Captura de tela da calculadora
└── README.md # Este arquivo
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

© 2025 financialcalculator | Todos os direitos reservados.