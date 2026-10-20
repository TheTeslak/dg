# SNN, CNN и современные LLM: состояние исследований в 2026 году

По состоянию на сентябрь 2026 года SNN, CNN и LLM относятся к разным уровням описания нейросетевых систем.

**CNN (Convolutional Neural Network)** — архитектурный класс, основанный на свёрточных операциях и пространственных inductive biases. **SNN (Spiking Neural Network)** — вычислительная парадигма, в которой информация передаётся дискретными событиями — spikes, а нейроны сохраняют внутреннее состояние во времени. **LLM (Large Language Model)** — класс больших языковых моделей; современные LLM обычно строятся на Transformer-подобных архитектурах, включая dense- и Mixture-of-Experts-варианты.

Поэтому convolution может использоваться внутри SNN, а Transformer — внутри spiking architecture. Одно из развивающихся направлений исследований — перенос механизмов Transformer и крупных sequence models на разреженную event-driven вычислительную основу.

## Характерные реализации

| Характеристика        | SNN                                                              | CNN                                           | современные LLM                                           |
| --------------------- | ---------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Уровень описания      | вычислительная парадигма                                         | архитектурный класс                           | класс моделей                                             |
| Характерные механизмы | spikes, состояние нейрона, synaptic updates                      | convolution                                   | Transformer, attention, MLP, часто MoE                    |
| Тип данных            | временные и событийные потоки; также кодированные обычные данные | изображения и другие регулярные spatial grids | последовательности токенов, мультимодальные представления |
| Разреженность         | во времени и по активности нейронов                              | обычно ограниченная                           | dense либо структурная sparsity через MoE                 |
| Временное состояние   | часть нейронной динамики                                         | обычно отсутствует                            | attention context, KV cache, recurrent/hybrid state       |
| Типичное оборудование | neuromorphic ASIC/FPGA, экспериментальные accelerators           | GPU, NPU, ASIC                                | GPU/TPU/NPU-кластеры                                      |
| Основные области      | event sensing, robotics, low-power edge                          | computer vision, edge inference               | language, multimodality, reasoning, agents                |
| Зрелость экосистемы   | исследовательская / специализированная                           | высокая                                       | высокая                                                   |

Таблица описывает типичные реализации, а не строгие границы между классами.

## 1. SNN: event-driven вычисления и hardware co-design

Типичный spiking neuron содержит динамическое состояние. Для упрощённого leaky integrate-and-fire нейрона:

$$
u_t=\lambda u_{t-1}+Wx_t-V_{\text{th}}s_{t-1},
$$

где \(u_t\) — membrane potential, а spike возникает при пересечении порога:

$$
s_t=H(u_t-V_{\text{th}}).
$$

SNN позволяют организовать вычисления так, чтобы synaptic updates происходили преимущественно при возникновении событий. Потенциальный энергетический выигрыш зависит от разреженности spikes, числа временных шагов и способности аппаратуры пропускать неактивные операции.

На обычном GPU преимущество реализуется не автоматически: если SNN исполняется как последовательность плотных tensor operations, отсутствие spikes не обязательно приводит к пропорциональному снижению физических вычислений.

Одно из направлений 2026 года — совместное проектирование алгоритма и оборудования. В **Dual Memory Pathway SNN** каждому слою добавлено компактное медленное состояние, дополняющее быстрый spiking pathway. На использованных авторами long-sequence benchmarks архитектура [сократила число параметров на 40–60%](https://www.nature.com/articles/s42256-026-01255-3) относительно сравниваемых state-of-the-art SNN при сопоставимой точности.

Параллельно развивается аппаратная поддержка обучения. Представленная в *Nature Communications* многоядерная neuromorphic architecture [сократила число обращений к DRAM на 55–85%](https://www.nature.com/articles/s41467-026-70586-x) относительно выбранной конфигурации NVIDIA A100 при обучении рассматриваемых SNN. В тех же SNN-training benchmarks авторы сообщают производительность на уровне 190–330% от Jetson AGX Orin. Эти показатели относятся к конкретной архитектуре, моделям и реализации.

Фронтир здесь смещается к совместной оптимизации **нейронной динамики, sparsity, memory traffic и специализированного hardware**.

## 2. Spiking Transformers и language models

В 2026 году появились spiking-архитектуры, непосредственно ориентированные на Transformer-based language modeling.

**Winner-Take-All Spiking Transformer for Language Modeling** [предлагает spike-driven self-attention без softmax](https://arxiv.org/abs/2604.11321) и рассматривает encoder-only и causal decoder-only архитектуры. Модели обучались end-to-end и оценивались на natural language understanding, question answering и commonsense reasoning.

Цель такого подхода — сохранить обработку глобальных зависимостей, характерную для Transformer, и сделать вычисления более совместимыми с event-driven исполнением.

До масштаба **1,5 млрд параметров** spiking language model доведена в работе **Large Language Models with At Most One Spike per Neuron**. Авторы [используют time-to-first-spike, TTFS](https://arxiv.org/abs/2609.05151), при котором нейрон генерирует не более одного spike за вычислительное окно, и реализуют embeddings, LayerNorm, attention-related operations и dropout в spiking formulation.

На natural-language-understanding и commonsense-reasoning задачах авторы сообщают результаты, близкие к ANN-аналогам, однако по language-modeling perplexity сохраняется разрыв. Энергетическая эффективность оценивается через spike-count cost model, а не непосредственным измерением энергопотребления 1,5-миллиардной модели на neuromorphic accelerator.

Spiking language models поэтому уже достигли миллиардного масштаба, но parity с production-scale dense или MoE LLM по качеству, обучаемости и инфраструктуре пока не показан.

## 3. Роль CNN в современных vision-системах

CNN остаются одним из основных архитектурных классов computer vision. Обзор object detection 2026 года [рассматривает CNN- и Transformer-based architectures как две основные современные парадигмы](https://www.nature.com/articles/s41598-026-37052-6).

Convolution вводит locality, weight sharing и translation equivariance непосредственно в архитектуру. Такие свойства особенно полезны при ограничениях на вычислительную стоимость, объём данных и возможности edge hardware.

В lightweight vision convolution и attention всё чаще комбинируют. Современные системы используют depthwise convolutions, convolutional token mixers, linear attention, pruning и distillation в одной архитектуре. Исследования CNN–Transformer hybrids также показывают, что [результат существенно зависит от схемы обучения](https://www.nature.com/articles/s41598-026-42748-w), включая optimizer, scheduling, augmentation и regularization.

CNN остаются зрелым и эффективным **spatial primitive**, особенно для edge и real-time vision, и широко используются как самостоятельно, так и внутри hybrid architectures.

## 4. Основные направления развития LLM

У LLM оптимизация идёт сразу на нескольких уровнях: архитектуре, serving infrastructure и inference procedure.

### Mixture-of-Experts

MoE увеличивает общую ёмкость модели, не активируя все параметры для каждого токена. Router выбирает ограниченное число experts:

$$
x \rightarrow \{E_{i_1},E_{i_2},\dots,E_{i_k}\}.
$$

Возникает структурная разреженность, отличная от SNN sparsity. В MoE пропускаются целые expert blocks, тогда как SNN использует разреженность на уровне spike events и synaptic updates.

Современные исследования MoE рассматривают не только routing quality, но и [expert topology, load balancing, expert parallelism, placement и communication overhead](https://arxiv.org/abs/2608.08650). Выигрыш от sparsity зависит от того, насколько логическая структура модели соответствует физическому распределению вычислений между accelerators.

### KV cache и memory bandwidth

Autoregressive Transformer хранит key/value tensors предыдущих токенов. Объём KV cache растёт с длиной последовательности и числом параллельных запросов, поэтому long-context inference ограничивается не только арифметическими FLOPs, но и memory capacity и bandwidth.

Обзор 2026 года [систематизирует методы KV-cache optimization](https://arxiv.org/abs/2603.20397) по управлению хранением, удержанием и обработкой context state.

Оптимизация одного компонента может переносить bottleneck на другой уровень memory hierarchy: помимо KV cache приходится перемещать model weights и activations. Поэтому эффективность LLM всё сильнее зависит от организации всей serving-системы, а не только от архитектуры базовой модели.

### Test-time compute

Качество LLM всё чаще повышают дополнительными вычислительными процедурами поверх базовой autoregressive generation: search, verification, multiple trajectories, tools и multi-agent interaction.

Обзор 2026 года [разделяет test-time scaling на несколько режимов](https://arxiv.org/abs/2608.04001), включая удлинение одной reasoning trajectory, генерацию нескольких candidates и search по промежуточным состояниям.

Современная LLM-система поэтому всё чаще включает:

$$
\text{model}+\text{memory}+\text{routing}+\text{tools/search}.
$$

## 5. Где SNN имеют естественное преимущество

Один из наиболее прямых случаев применения SNN — обработка асинхронных потоков сенсорных данных.

Обычная камера периодически создаёт полный кадр независимо от количества изменений в сцене. Event camera генерирует события при локальном изменении сигнала. При низкой событийности значительная часть нейронных состояний не требует обновления, поэтому event-driven hardware может уменьшать число операций и объём перемещаемых данных.

Связка

$$
\text{event sensor}\rightarrow\text{SNN}\rightarrow\text{neuromorphic accelerator}
$$

лучше соответствует внутренней структуре SNN, чем преобразование обычного статического изображения в искусственную spike sequence.

Event-based vision при этом остаётся менее стандартизированной областью, чем conventional vision. В августе 2026 года *Nature Sensors* [указал на отсутствие общепринятых процедур calibration, processing и metadata representation](https://www.nature.com/articles/s44460-026-00100-9), необходимых для массового развёртывания event-camera systems.

Отдельная проблема — latency. Работа по continuous event-stream evaluation [показала, что задержка может существенно снижать online accuracy](https://www.nature.com/articles/s41467-026-70240-6), если систему оценивать на реальном непрерывном потоке, а не на искусственно синхронизированных frames.

## 6. Как корректно сравнивать энергопотребление

Сравнение SNN и обычных ANN по одному числу «energy per inference» без описания экспериментальной постановки обычно некорректно.

Для SNN стоимость зависит как минимум от числа simulation timesteps \(T\), средней firing rate \(r\), типа synaptic operation, memory traffic и hardware implementation. Упрощённо вычислительную нагрузку можно представить как

$$
C_{\mathrm{SNN}}\propto T\,r_{\mathrm{spike}}\,N_{\mathrm{synops}}.
$$

Низкая firing rate не гарантирует низкого энергопотребления, если модель требует большого числа временных шагов или исполняется на hardware, неспособном эффективно использовать sparsity.

Например, **SpikeMicroNet** [показала 95,1% top-1 accuracy и до 28,4× меньшую оценочную model-side compute energy](https://www.nature.com/articles/s41598-026-63305-5) относительно выбранного dense Vision Transformer baseline в задаче классификации позы микроробота. Это оценка вычислительной энергии конкретной модели, а не универсальный коэффициент превосходства SNN и не прямое измерение полного энергопотребления системы.

Содержательное сравнение должно фиксировать model architecture, dataset, precision, latency, temporal encoding, hardware и метод измерения энергии.

## 7. Сравнение по областям применения

Для **обычного computer vision** CNN и CNN–Transformer hybrids остаются существенно более зрелыми: доступны оптимизированные GPU/NPU kernels, training pipelines и deployment toolchains.

Для **event cameras, always-on sensors, robotics и других sparse temporal streams** SNN имеют сильное архитектурное обоснование, особенно при наличии специализированного neuromorphic hardware.

Для **language modeling, multimodality и general-purpose reasoning** доминирующей основой остаются Transformer-like LLM. Основные направления оптимизации здесь — MoE, quantization, memory management, KV-cache optimization и test-time compute.

**Spiking language models** в 2026 году достигли масштаба до 1,5 млрд параметров, но пока остаются исследовательскими и не показывают общего преимущества над conventional LLM по качеству или эффективности реального deployment.

## Вывод

**CNN** сохраняются как зрелый spatial primitive для эффективной обработки изображений. **Современные LLM** развиваются через Transformer-derived architectures, MoE, оптимизацию памяти и дополнительные вычисления во время inference. **SNN** развиваются как event-driven computational paradigm для разреженных временных вычислений и тесно связаны с neuromorphic hardware.

Пересечение этих направлений уже стало отдельной исследовательской линией:

$$
\text{Transformer-level modeling}
+
\text{structural sparsity}
+
\text{event-driven execution}
+
\text{neuromorphic hardware}.
$$

Работы 2026 года показывают техническую реализуемость spiking attention и language models миллиардного масштаба, но пока не подтверждают parity с conventional dense или MoE LLM в general-purpose задачах.

Потенциальное преимущество такого подхода связано прежде всего с возможностью пропускать вычисления и перемещения данных при отсутствии релевантной активности, а не с биологической правдоподобностью модели.
