// Guia de Aprendizagem card data — ported from samba-paper v1

export type Tecnica = { id: number; nome: string; descritor: string }
export type Grupo   = { id: string; label: string; items: string[]; defaultOpen?: boolean }

export const BNCC_COMPETENCIAS: Tecnica[] = [
  { id: 1,  nome: 'Conhecimento', descritor: 'Valorizar e utilizar os conhecimentos historicamente construídos sobre o mundo físico, social, cultural e digital para entender e explicar a realidade, continuar aprendendo e colaborar para a construção de uma sociedade justa, democrática e inclusiva.' },
  { id: 2,  nome: 'Pensamento científico, crítico e criativo', descritor: 'Exercitar a curiosidade intelectual e recorrer à abordagem própria das ciências, incluindo a investigação, a reflexão, a análise crítica, a imaginação e a criatividade, para investigar causas, elaborar e testar hipóteses, formular e resolver problemas e criar soluções.' },
  { id: 3,  nome: 'Repertório cultural', descritor: 'Valorizar e fruir as diversas manifestações artísticas e culturais, das locais às mundiais, e também participar de práticas diversificadas da produção artístico-cultural.' },
  { id: 4,  nome: 'Comunicação', descritor: 'Utilizar diferentes linguagens — verbal, corporal, visual, sonora e digital — bem como conhecimentos das linguagens artística, matemática e científica, para se expressar e partilhar informações, experiências, ideias e sentimentos em diferentes contextos.' },
  { id: 5,  nome: 'Cultura digital', descritor: 'Compreender, utilizar e criar tecnologias digitais de informação e comunicação de forma crítica, significativa, reflexiva e ética nas diversas práticas sociais para se comunicar, acessar e disseminar informações, produzir conhecimentos e resolver problemas.' },
  { id: 6,  nome: 'Trabalho e projeto de vida', descritor: 'Valorizar a diversidade de saberes e vivências culturais e apropriar-se de conhecimentos e experiências que lhe possibilitem entender as relações próprias do mundo do trabalho e fazer escolhas alinhadas ao exercício da cidadania e ao seu projeto de vida.' },
  { id: 7,  nome: 'Argumentação', descritor: 'Argumentar com base em fatos, dados e informações confiáveis, para formular, negociar e defender ideias, pontos de vista e decisões comuns que respeitem e promovam os direitos humanos, a consciência socioambiental e o consumo responsável, com posicionamento ético.' },
  { id: 8,  nome: 'Autoconhecimento e autocuidado', descritor: 'Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, compreendendo-se na diversidade humana e reconhecendo suas emoções e as dos outros, com autocrítica e capacidade para lidar com elas.' },
  { id: 9,  nome: 'Empatia e cooperação', descritor: 'Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, fazendo-se respeitar e promovendo o respeito ao outro e aos direitos humanos, com acolhimento e valorização da diversidade, sem preconceitos de qualquer natureza.' },
  { id: 10, nome: 'Responsabilidade e cidadania', descritor: 'Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliência e determinação, tomando decisões com base em princípios éticos, democráticos, inclusivos, sustentáveis e solidários.' },
]

export const DESENVOLVIMENTO_OPTS: Tecnica[] = [
  { id:  1, nome: 'Resolução orientada de problemas',       descritor: 'Desenvolve conceitos por meio da resolução guiada de situações-problema.' },
  { id:  2, nome: 'Aprendizagem baseada em problemas (PBL)', descritor: 'Investiga problema complexo em grupo, articulando teoria e prática.' },
  { id:  3, nome: 'Aprendizagem baseada em projetos (PjBL)', descritor: 'Desenvolve produto ou solução ao longo da atividade com aplicação real.' },
  { id:  4, nome: 'Estudo de caso aprofundado',             descritor: 'Analisa situação detalhada, propondo soluções fundamentadas.' },
  { id:  5, nome: 'Experimentação prática',                 descritor: 'Realiza experimentos para observar fenômenos e validar hipóteses.' },
  { id:  6, nome: 'Modelagem matemática/científica',        descritor: 'Representa situações reais por meio de modelos matemáticos ou computacionais.' },
  { id:  7, nome: 'Programação aplicada',                   descritor: 'Desenvolve algoritmos/códigos para resolver problemas específicos.' },
  { id:  8, nome: 'Rotação por estações',                   descritor: 'Alterna atividades em diferentes estações com foco em habilidades diversas.' },
  { id:  9, nome: 'Sala de aula invertida (aplicação)',     descritor: 'Aplica conhecimentos previamente estudados em atividades práticas.' },
  { id: 10, nome: 'Aprendizagem colaborativa estruturada',  descritor: 'Resolve tarefas em grupo com papéis definidos e interdependência.' },
  { id: 11, nome: 'Resolução em níveis (progressão)',       descritor: 'Trabalha atividades com dificuldade crescente para consolidar aprendizagem.' },
  { id: 12, nome: 'Análise e interpretação de dados',       descritor: 'Explora dados reais para extrair padrões, conclusões e inferências.' },
  { id: 13, nome: 'Simulação (digital ou analógica)',       descritor: 'Utiliza simulações para compreender sistemas complexos.' },
  { id: 14, nome: 'Construção de protótipos',               descritor: 'Desenvolve artefatos físicos ou digitais para testar ideias.' },
  { id: 15, nome: 'Debate estruturado',                     descritor: 'Discute ideias com base em evidências e argumentação lógica.' },
  { id: 16, nome: 'Ensino entre pares (peer instruction)',  descritor: 'Alunos explicam conceitos entre si com mediação do professor.' },
  { id: 17, nome: 'Resolução comentada (metacognição)',     descritor: 'Explicita o raciocínio durante a resolução de problemas.' },
  { id: 18, nome: 'Gamificação aplicada',                   descritor: 'Utiliza mecânicas de jogo para engajar na resolução de desafios.' },
  { id: 19, nome: 'Investigação guiada (inquiry-based)',    descritor: 'Conduz investigação com orientação parcial do professor.' },
  { id: 20, nome: 'Uso de tecnologias digitais interativas', descritor: 'Utiliza softwares, sensores ou plataformas para exploração ativa.' },
]

export const RECURSOS_GRUPOS: Grupo[] = [
  { id: 'essenciais', label: 'Essenciais', defaultOpen: true,
    items: ['Slides Oficiais & Livros dos Estudantes', 'Livro didático', 'Quadro branco', 'Caderno de atividades', 'Material impresso / Xerox', 'Material manipulável', 'Projetor / Datashow'] },
  { id: 'digitais', label: 'Digitais',
    items: ['Computador / Tablet', 'Acesso à internet', 'AVA (Google Classroom / Moodle)', 'Plataforma de quizzes (Kahoot / Quizizz)', 'Simuladores digitais (PhET / Tinkercad)', 'Softwares específicos (Python / GeoGebra / Excel)', 'Mural colaborativo (Padlet / Jamboard)', 'Documentos compartilhados (Google Docs)', 'Inteligência Artificial (apoio à aprendizagem)', 'Vídeo / Recurso audiovisual'] },
  { id: 'maker', label: 'Experimental / Maker',
    items: ['Kit Arduino / ESP / IoT', 'Sensores e dispositivos eletrônicos', 'Materiais recicláveis (prototipagem)', 'Impressora 3D / prototipagem rápida', 'Laboratório móvel / experimental'] },
  { id: 'colaborativos', label: 'Colaborativos / Pedagógicos',
    items: ['Cartões de discussão (flashcards)', 'Jogos educativos', 'Estudos de caso impressos/digitais', 'Roteiros de investigação', 'Sequências didáticas estruturadas', 'Podcast / áudio educativo', 'Infográficos'] },
]

export const AVALIACAO_GRUPOS: Grupo[] = [
  { id: 'diagnostica', label: 'Diagnóstica', defaultOpen: true,
    items: ['Observação e participação', 'Avaliação diagnóstica inicial', 'Quiz diagnóstico rápido', 'Levantamento de hipóteses', 'Pergunta inicial / geradora'] },
  { id: 'formativa', label: 'Formativa',
    items: ['Atividade em sala', 'Exercícios no caderno', 'Feedback contínuo', 'Avaliação processual', 'Rubrica avaliativa'] },
  { id: 'ativa', label: 'Ativa (protagonismo)',
    items: ['Trabalho em grupo', 'Avaliação por pares', 'Autoavaliação guiada', 'Coavaliação (aluno + professor)', 'Avaliação por participação qualificada'] },
  { id: 'producao', label: 'Por Produção',
    items: ['Projeto / produto final', 'Protótipo funcional', 'Código / programa desenvolvido', 'Relatório científico', 'Portfólio (digital ou físico)', 'Apresentação oral', 'Vídeo produzido pelo aluno', 'Mapa conceitual'] },
  { id: 'somativa', label: 'Somativa',
    items: ['Avaliação escrita / Prova', 'Tarefa de casa'] },
  { id: 'rapida', label: 'Rápida (tempo real)',
    items: ['Exit ticket', 'Pergunta-chave ao final da aula', 'Votação interativa', 'Mini quiz diagnóstico contínuo'] },
]

export const RECURSO_OBRIGATORIO = 'Slides Oficiais & Livros dos Estudantes'

export type ComposicaoItem  = { pct: number; nome: string }
export type ComposicaoModel = { id: number; bloco: string; pp: number; nome: string; desc?: string; itens: ComposicaoItem[] }

export const COMPOSICAO_MODELS: ComposicaoModel[] = [
  { id:1, bloco:'A', pp:30, nome:'Equilibrado Universal',   desc:'Bom para quase todas as áreas', itens:[{pct:30,nome:'Prova Paulista'},{pct:30,nome:'Avaliação do professor'},{pct:20,nome:'Atividades processuais'},{pct:20,nome:'Projeto/trabalho'}] },
  { id:2, bloco:'A', pp:30, nome:'Humanidades Reflexivo',   desc:'Filosofia / Sociologia', itens:[{pct:30,nome:'Prova Paulista'},{pct:35,nome:'Produção argumentativa'},{pct:20,nome:'Debate/seminário'},{pct:15,nome:'Participação qualificada'}] },
  { id:3, bloco:'A', pp:30, nome:'Física Enxuta',          desc:'Baixa carga horária', itens:[{pct:30,nome:'Prova Paulista'},{pct:40,nome:'Prova integrada'},{pct:20,nome:'Lista aplicada'},{pct:10,nome:'Microatividades'}] },
  { id:4, bloco:'A', pp:30, nome:'Projeto e Competência',  desc:'PEI / eletivas', itens:[{pct:30,nome:'Prova Paulista'},{pct:40,nome:'Projeto prático'},{pct:20,nome:'Processo'},{pct:10,nome:'Engajamento'}] },
  { id:5, bloco:'B', pp:35, nome:'Gestão por Resultados',  desc:'Moderado', itens:[{pct:35,nome:'Prova Paulista'},{pct:30,nome:'Avaliação docente'},{pct:20,nome:'Exercícios'},{pct:15,nome:'Participação'}] },
  { id:6, bloco:'B', pp:35, nome:'Linguagens', itens:[{pct:35,nome:'Prova Paulista'},{pct:30,nome:'Redação/produção textual'},{pct:20,nome:'Leitura e interpretação'},{pct:15,nome:'Participação'}] },
  { id:7, bloco:'B', pp:35, nome:'STEM Contemporâneo', itens:[{pct:35,nome:'Prova Paulista'},{pct:30,nome:'Resolução de problemas'},{pct:20,nome:'Projeto/simulação'},{pct:15,nome:'Relatórios'}] },
  { id:8, bloco:'B', pp:35, nome:'Filosofia Moderna', itens:[{pct:35,nome:'Prova Paulista'},{pct:35,nome:'Ensaio reflexivo'},{pct:15,nome:'Debate filosófico'},{pct:15,nome:'Participação'}] },
  { id:9, bloco:'C', pp:40, nome:'Tradicional Modernizado', itens:[{pct:40,nome:'Prova Paulista'},{pct:35,nome:'Avaliação do professor'},{pct:15,nome:'Exercícios'},{pct:10,nome:'Participação'}] },
  { id:10,bloco:'C', pp:40, nome:'ENEM Estratégico', itens:[{pct:40,nome:'Prova Paulista'},{pct:30,nome:'Simulado'},{pct:20,nome:'Lista discursiva'},{pct:10,nome:'Participação'}] },
  { id:11,bloco:'C', pp:40, nome:'Física Objetiva', itens:[{pct:40,nome:'Prova Paulista'},{pct:35,nome:'Problemas quantitativos'},{pct:15,nome:'Relatório experimental'},{pct:10,nome:'Participação'}] },
  { id:12,bloco:'C', pp:40, nome:'Humanidades Analítico', itens:[{pct:40,nome:'Prova Paulista'},{pct:30,nome:'Produção crítica'},{pct:20,nome:'Seminário'},{pct:10,nome:'Engajamento'}] },
  { id:13,bloco:'D', pp:45, nome:'Alto Controle', itens:[{pct:45,nome:'Prova Paulista'},{pct:35,nome:'Avaliação do professor'},{pct:10,nome:'Exercícios'},{pct:10,nome:'Participação'}] },
  { id:14,bloco:'D', pp:45, nome:'Baixa Carga Inteligente', desc:'Filosofia / Arte / Sociologia', itens:[{pct:45,nome:'Prova Paulista'},{pct:35,nome:'Trabalho síntese'},{pct:20,nome:'Participação'}] },
  { id:15,bloco:'D', pp:45, nome:'Matemática Intensiva', itens:[{pct:45,nome:'Prova Paulista'},{pct:30,nome:'Prova docente'},{pct:15,nome:'Lista de exercícios'},{pct:10,nome:'Correção comentada'}] },
  { id:16,bloco:'D', pp:45, nome:'Tecnologia e Robótica', itens:[{pct:45,nome:'Prova Paulista'},{pct:30,nome:'Produto digital'},{pct:15,nome:'Desenvolvimento/processo'},{pct:10,nome:'Pitch/apresentação'}] },
  { id:17,bloco:'E', pp:50, nome:'Gestão Extrema', itens:[{pct:50,nome:'Prova Paulista'},{pct:30,nome:'Avaliação do professor'},{pct:10,nome:'Exercícios'},{pct:10,nome:'Participação'}] },
  { id:18,bloco:'E', pp:50, nome:'Compacto 1 aula/semana', desc:'Muito racional em termos de tempo', itens:[{pct:50,nome:'Prova Paulista'},{pct:35,nome:'Trabalho bimestral'},{pct:15,nome:'Participação'}] },
  { id:19,bloco:'E', pp:50, nome:'Vestibular Pesado', itens:[{pct:50,nome:'Prova Paulista'},{pct:25,nome:'Simulado'},{pct:15,nome:'Redação/listas'},{pct:10,nome:'Participação'}] },
  { id:20,bloco:'E', pp:50, nome:'Evidência Mínima', desc:'Extremamente enxuto', itens:[{pct:50,nome:'Prova Paulista'},{pct:40,nome:'Produção avaliativa única'},{pct:10,nome:'Engajamento'}] },
]

export const BLOCO_LABELS: Record<string, string> = { A:'30% PP', B:'35% PP', C:'40% PP', D:'45% PP', E:'50% PP' }
export const BLOCO_ACCENT: Record<string, string> = { A:'#10b981', B:'#3b82f6', C:'#f59e0b', D:'#f97316', E:'#ef4444' }

export const BIMESTRE_DATAS: Record<string, string> = {
  '1': '02/02 a 22/04',
  '2': '23/04 a 06/07',
  '3': '24/07 a 02/10',
  '4': '05/10 a 18/12',
}

export function modelToText(m: ComposicaoModel): string {
  const itens = m.itens.map(i => `${i.nome}: ${i.pct}%`).join(' · ')
  return `${m.nome}\n${itens}`
}

export const REFERENCIAS_PADRAO = `BRASIL. Base Nacional Comum Curricular. Brasília: Ministério da Educação, 2018. Disponível em: http://basenacionalcomum.mec.gov.br/. Acesso em: 5 jan. 2026.
BRASIL. Base Nacional Comum Curricular: Ensino Médio. Brasília: Ministério da Educação, 2018.
SÃO PAULO (Estado). Secretaria da Educação. Currículo Paulista: Ensino Médio. São Paulo: SEDUC-SP, 2020. Disponível em: https://efape.educacao.sp.gov.br/curriculopaulista/. Acesso em: 5 jan. 2026.
BRASIL. Conselho Nacional de Educação. Resolução CNE/CEB nº 3, de 21 de novembro de 2018. Atualiza as Diretrizes Curriculares Nacionais para o Ensino Médio.
BRASIL. Lei nº 9.394, de 20 de dezembro de 1996. Estabelece as diretrizes e bases da educação nacional.
LUCKESI, Cipriano Carlos. Avaliação da aprendizagem escolar. 22. ed. São Paulo: Cortez, 2011.
ZABALA, Antoni. A prática educativa: como ensinar. Porto Alegre: Artmed, 2010.
LIBÂNEO, José Carlos. Didática. São Paulo: Cortez, 2013.
MORAN, José Manuel. Metodologias ativas para uma educação inovadora. Porto Alegre: Penso, 2018.`
