document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const container = document.querySelector('.container');
    const progressBar = document.getElementById('progressBar');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');

    // Variables
    let questions = [];
    let currentQuestionIndex = 0;

    // Fetch questions from JSON file
    fetch('questions_improved.json')
        .then(response => response.json())
        .then(data => {
            questions = data;
            totalQuestionsSpan.textContent = questions.length;
            initializeQuestionCard();
            loadQuestion(currentQuestionIndex);
            updateProgressBar();
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            // Display error message to user
            container.innerHTML = `
                <div class="error-message">
                    <h2>Error Loading Questions</h2>
                    <p>There was a problem loading the question data. Please try using a local web server.</p>
                    <p>Error details: ${error.message}</p>
                </div>
            `;
        });

    // Function to initialize the question card structure
    function initializeQuestionCard() {
        // Create main element if it doesn't exist
        let main = document.querySelector('main');
        if (!main) {
            main = document.createElement('main');
            container.appendChild(main);
        } else {
            main.innerHTML = ''; // Clear main if it exists
        }

        // Create question card structure
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';

        questionCard.innerHTML = `
            <div class="question-header">
                <span class="question-number"></span>
                <span class="topic-badge"></span>
            </div>
            <div class="question-body"></div>
            <div class="choices-container"></div>
            <div class="actions">
                <button id="revealBtn" class="btn btn-primary">Show Answer</button>
                <button id="hideBtn" class="btn btn-secondary" style="display: none;">Hide Answer</button>
            </div>
            <div class="answer-container" style="display: none;">
                <div class="answer-header">
                    <strong>Suggested Answer:</strong> <span class="correct-answer"></span>
                    <button class="vote-btn" title="Vote for this answer">🗳️</button>
                </div>
                <div class="vote-distribution">
                    <h4>Community Vote Distribution</h4>
                    <div class="vote-chart">
                        <div class="vote-bar"></div>
                    </div>
                    <div class="vote-details"></div>
                </div>
            </div>

            
        `;

        main.appendChild(questionCard);

        // Create navigation if it doesn't exist
        if (!document.querySelector('.navigation')) {
            const navigation = document.createElement('div');
            navigation.className = 'navigation';
            navigation.innerHTML = `
                <button id="prevBtn" class="nav-btn">Previous</button>
                <button id="nextBtn" class="nav-btn">Next</button>
            `;
            container.appendChild(navigation);

        }


        const footer = document.createElement('footer');
        footer.className = 'footer';
        footer.innerHTML = `
        <p>Created by Mina Safwat</p>
        `;
        container.appendChild(footer);



        // Reinitialize button references
        initializeEventListeners();
    }

    // Function to initialize event listeners
    function initializeEventListeners() {
        const revealBtn = document.getElementById('revealBtn');
        const hideBtn = document.getElementById('hideBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (revealBtn) {
            revealBtn.addEventListener('click', revealAnswer);
        }

        if (hideBtn) {
            hideBtn.addEventListener('click', hideAnswer);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (currentQuestionIndex > 0) {
                    currentQuestionIndex--;
                    loadQuestion(currentQuestionIndex);
                    updateProgressBar();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    loadQuestion(currentQuestionIndex);
                    updateProgressBar();
                }
            });
        }
    }

    function loadQuestion(index) {
        const question = questions[index];
        const questionCard = document.querySelector('.question-card');
    
        if (!question || !questionCard) return;
    
        // Reset the UI state
        hideAnswer();
    
        // Update question card
        questionCard.setAttribute('data-id', question.id);
    
        // Update question header
        document.querySelector('.question-number').textContent = `Question ${question.number}`;
        document.querySelector('.topic-badge').textContent = `Topic ${question.topic}`;
    
        // Update question body
        const questionBody = document.querySelector('.question-body');
        questionBody.innerHTML = `<p>${question.text}</p>`;
    
        // Handle images (if present)
        if (question.images && question.images.length > 0) {
            question.images.forEach(image => {
                const imgElement = document.createElement('img');
                imgElement.src = image;
                imgElement.alt = 'Question Image';
                imgElement.className = 'question-image';
                questionBody.appendChild(imgElement);
            });
        }
    
        // Generate choices
        const choicesContainer = document.querySelector('.choices-container');
        choicesContainer.innerHTML = '';
    
        question.choices.forEach(choice => {
            const choiceItem = document.createElement('div');
            choiceItem.className = 'choice-item';
            choiceItem.setAttribute('data-choice', choice.letter);
    
            choiceItem.innerHTML = `
                <div class="choice-letter">${choice.letter}</div>
                <div class="choice-text">${choice.text}</div>
            `;
    
            // Handle multi-answer questions
            if (question.isMultiAnswer) {
                choiceItem.addEventListener('click', function () {
                    // Toggle the selected class
                    this.classList.toggle('selected');
                });
            } else {
                // Single-answer questions
                choiceItem.addEventListener('click', function () {
                    // Remove selected from all choices
                    document.querySelectorAll('.choice-item').forEach(item => {
                        item.classList.remove('selected');
                    });
    
                    // Add selected class
                    this.classList.add('selected');
                });
            }
    
            choicesContainer.appendChild(choiceItem);
        });
    
        // Update answer container
        const correctAnswers = question.correctAnswers || [];
        const correctChoices = question.choices.filter(choice => correctAnswers.includes(choice.letter));
        document.querySelector('.correct-answer').textContent = correctChoices.map(choice => choice.letter).join(', ');
    
        // Update vote distribution
        updateVoteDistribution(question.choices);
    
        // Update navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
    
        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index === questions.length - 1;
    }

    function revealAnswer() {
        const answerContainer = document.querySelector('.answer-container');
        const revealBtn = document.getElementById('revealBtn');
        const hideBtn = document.getElementById('hideBtn');
    
        if (!answerContainer || !revealBtn || !hideBtn) return;
    
        const question = questions[currentQuestionIndex];
        const correctAnswers = question.correctAnswers || [];
        const mostVotedChoice = question.choices.find(choice => choice.mostVoted);
    
        answerContainer.style.display = 'block';
        revealBtn.style.display = 'none';
        hideBtn.style.display = 'inline-block';
    
        // Highlight the correct answers and add most voted badge
        document.querySelectorAll('.choice-item').forEach(item => {
            const choiceLetter = item.getAttribute('data-choice');
    
            // Add correct class to correct answers
            if (correctAnswers.includes(choiceLetter)) {
                item.classList.add('correct');
            }
    
            // Add most voted badge
            if (mostVotedChoice && choiceLetter === mostVotedChoice.letter) {
                if (!item.querySelector('.most-voted-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'most-voted-badge';
                    badge.textContent = 'Most Voted';
                    item.appendChild(badge);
                }
            }
        });
    }

    function hideAnswer() {
        const answerContainer = document.querySelector('.answer-container');
        const revealBtn = document.getElementById('revealBtn');
        const hideBtn = document.getElementById('hideBtn');
    
        if (!answerContainer) return;
    
        answerContainer.style.display = 'none';
    
        if (hideBtn) hideBtn.style.display = 'none';
        if (revealBtn) revealBtn.style.display = 'inline-block';
    
        // Remove highlight and most voted badge from choices
        document.querySelectorAll('.choice-item').forEach(item => {
            item.classList.remove('correct');
            item.classList.remove('selected');
    
            // Remove most voted badge
            const badge = item.querySelector('.most-voted-badge');
            if (badge) badge.remove();
        });
    }

    // Function to update the vote distribution
    function updateVoteDistribution(choices) {
        const voteChart = document.querySelector('.vote-chart');
        const voteDetails = document.querySelector('.vote-details');

        if (!voteChart || !voteDetails) return;

        const totalVotes = choices.reduce((sum, choice) => sum + choice.votes, 0);

        // Clear existing content
        voteChart.innerHTML = '<div class="vote-bar"></div>';
        voteDetails.innerHTML = '';

        const voteBar = voteChart.querySelector('.vote-bar');

        // Sort choices by votes (descending)
        const sortedChoices = [...choices].sort((a, b) => b.votes - a.votes);

        // Add vote progress elements
        sortedChoices.forEach(choice => {
            const percentage = totalVotes > 0 ? Math.round((choice.votes / totalVotes) * 100) : 0;

            // Create progress element
            const progressElement = document.createElement('div');
            progressElement.className = `vote-progress vote-option-${choice.letter.toLowerCase()}`;
            progressElement.style.width = `${percentage}%`;
            progressElement.textContent = `${choice.letter} (${percentage}%)`;
            voteBar.appendChild(progressElement);

            // Add vote detail
            const detailElement = document.createElement('div');
            detailElement.className = 'vote-detail';
            detailElement.innerHTML = `
                <span class="dot ${choice.letter.toLowerCase()}-dot"></span>
                ${choice.letter}: ${choice.votes} votes
            `;
            voteDetails.appendChild(detailElement);
        });
    }

    // Update progress bar
    function updateProgressBar() {
        if (!progressBar || !currentQuestionSpan) return;

        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
    }
});