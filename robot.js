const startBtn = document.querySelector('#start');
const amountEl = document.querySelector('.amount-field');
const overlapEl = document.querySelector('#overlap-value');
const allInEl = document.querySelector('#all-in-value');
const spinnerEl = document.querySelector('#loader');
const liveTradingEl = document.querySelector('#lt-value');
const additionalOptionsEl = document.querySelector('#additional-options');

loadAmount();
loadOverlap();
loadLiveTrading();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message === 'toggleSpinner') {
        toggleSpinnerVisibility();
    }
    else if (request.message === 'makeActionsIfOverlap') {
        if (overlapEl.checked) {
            increaseBetAmount();
        }
    }
    else if (request.message === 'getSelectedAmount') {
        const amount = amountEl.value;
        sendResponse(parseInt(amount));
    }
    else if (request.message === 'getIsOverlapEnabled') {
        sendResponse(overlapEl.checked);
    }
    else if (request.message === 'getIsAllInEnabled') {
        sendResponse(localStorage.getItem('all-in') === 'true' ? true : false);
    }
});

startBtn.addEventListener('click', () => {
    const amount = amountEl.value;

    chrome.tabs.query({active: true}, function(tabs) {
        const tab = tabs[0];
        if (tab) {
            if (tab.url.includes("https://pocketoption.com")) {
                chrome.scripting.executeScript(
                    {
                        target: {tabId: tab.id, allFrames: true},
                        func: callOrPut,
                        args: [tab.id, amount]
                    }
                );
            }
            else {
                alert('🤖 The robot is unavailable. Select Pocket Option tab!');
                return;
            }
        }
    });
});

amountEl.addEventListener('change', (event) => {
    if (!event.target.value) {
        amountEl.value = '0';
    }
    localStorage.setItem('amount', event.target.value);
});

overlapEl.addEventListener('change', (event) => {
    localStorage.setItem('overlap', event.target.checked);
});

liveTradingEl.addEventListener('change', (event) => {
    localStorage.setItem('liveTrading', event.target.checked);
});

allInEl.addEventListener('change', (event) => {
    localStorage.setItem('all-in', event.target.checked);
});

additionalOptionsEl.addEventListener('click', (event) => {
    const allInLabelEl = document.querySelector('.all-in-label');
    const allInValueEl = document.querySelector('.all-in-value');

    if (allInLabelEl.style.display === 'none') {
        allInLabelEl.style.display = 'inline';
        allInValueEl.style.display = 'inline';
    }
    else {
        allInLabelEl.style.display = 'none';
        allInValueEl.style.display = 'none';
    }
});

function loadAmount() {
    const amount = localStorage.getItem('amount');
    if (amount) {
        amountEl.value = amount;
    }
}

function loadOverlap() {
    const overlap = localStorage.getItem('overlap');
    overlapEl.checked = (overlap === 'true') ? true : false;
}

function loadLiveTrading() {
    const liveTrading = localStorage.getItem('liveTrading');
    liveTradingEl.checked = (liveTrading === 'true') ? true : false;
}

function increaseBetAmount() {
    const INCREASE_BET_BY_PERCENT = 60;
    let amount = parseInt(amountEl.value) * (1.0 + INCREASE_BET_BY_PERCENT / 100);
    amountEl.value = Math.round(amount);
    localStorage.setItem('amount', Math.round(amount));
}

function toggleSpinnerVisibility() {
    if (spinnerEl.classList.contains('loader-off')) {
        spinnerEl.classList.remove('loader-off');
        startBtn.classList.add('start-off');
    }
    else { 
        spinnerEl.classList.add('loader-off');
        startBtn.classList.remove('start-off');
    }
}

function callOrPut(tabId, amount) {
    // Functions
    const getRandomInt = (max) => {
        return Math.floor(Math.random() * max);
    };
    const getRandomIntBetween = (min, max) => {
        const rnd = min + Math.random() * (max + 1 - min);
        return Math.floor(rnd);
    };
    const showHideSpinner = () => {
        chrome.runtime.sendMessage({message: 'toggleSpinner'});
    };
    const getBetButton = () => {
        const dir = (Math.random() < 0.5) ? '.btn-call' : '.btn-put';
        return document.querySelector(dir);
    };
    const getExpirationTimeEl = () => {
        return document.querySelector('.js-tour-block--expiration-inputs .value--several-items .value__val');
    };
    const getBetAmountFieldEl = () => {
        return document.querySelector('.js-tour-block--bet-amount input');
    }
    const extractExpirationTimeFromEl = (el) => {
        const time = el.innerHTML;
        const parts = time.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        return (hours * 3600 + minutes * 60 + seconds);
    };
    const getIsRealBalance = () => {
        const balanceLabel = document.querySelector('.balance-info-block__label');
        return (balanceLabel && balanceLabel.innerHTML.trim() == 'QT Real');
    };
    const getBalance = () => {
        const balanceEl = document.querySelector('.js-balance-real');
        if (balanceEl) {
            const balanceValue = balanceEl.innerHTML;
            const parsedBalance = parseInt(balanceValue);
            if (parsedBalance === NaN) {
                return 0;
            }
            return parsedBalance;
        }
        return 0;
    }
    const getIsMinimalDemo = () => {
        return getBalance() >= 50.0;
    };
    const makeActionsOfOverlap = () => {
        chrome.runtime.sendMessage({message: 'makeActionsIfOverlap'});
    };
    const updateAmountFromRobot = (selectedAmount) => {
        const betAmountEl = getBetAmountFieldEl();
        if (betAmountEl) {
            betAmountEl.value = '$' + selectedAmount;
            betAmountEl.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        }
    };
    const updateExpirationTime = () => {
        const expirationTimeEl = getExpirationTimeEl();
        expirationTimeEl.innerHTML = '0:00:05';
        expirationTimeEl.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    };

    const MIN_THINK_PERIOD_SEC = 1;
    const MAX_THINK_PERIOD_SEC = 3;

    if (!getIsRealBalance()) {
        alert('❌ The robot works only with real balance account');
        return;
    }

    if (!getIsMinimalDemo()) {
        alert('❌ The minimal balance is 50$');
        return;
    }

    chrome.runtime.sendMessage({message: 'getSelectedAmount'}, (selectedAmount) => {
        if (selectedAmount === null) {
            alert('❌ The selected amount should be specified');
            return;
        }

        if (getBalance() - selectedAmount < 0) {
            alert('❌ The selected amount is less then the balance');
            return;
        }

        updateAmountFromRobot(getBalance());

        const expirationTimeEl = getExpirationTimeEl();
        let expirationTime = extractExpirationTimeFromEl(expirationTimeEl);
        const oldBalance = getBalance();
        const betButton = getBetButton();

        chrome.runtime.sendMessage({message: 'getIsAllInEnabled'}, (isAllInEnabled) => {
            if (isAllInEnabled) {
                //updateExpirationTime();

                setTimeout(function() {
                    betButton.click();
                    setTimeout(function() {
                        const newBalance = getBalance();
                        if (newBalance > 0) {
                            updateAmountFromRobot(newBalance);
                            betButton.click();
                            expirationTime = extractExpirationTimeFromEl(expirationTimeEl);
                            setTimeout(function() {
                                const secondLeftBalance = getBalance();
                                updateAmountFromRobot(secondLeftBalance);
                                betButton.click();
                            }, expirationTime * 1000 + 1000);
                        }
                    }, expirationTime * 1000 + 1000);
                }, 250);                
            }
            else {
                showHideSpinner();
                makeActionsOfOverlap();
    
                if (betButton) {
                    let analysisPeriod = getRandomIntBetween(MIN_THINK_PERIOD_SEC, MAX_THINK_PERIOD_SEC);
                    setTimeout(function() {
                        betButton.click();
                        showHideSpinner();
                        setTimeout(function() {
                            const actualBalance = getBalance();
                            if (chrome.runtime.sendMessage({message: 'getIsOverlapEnabled'}, function(isEnabled) {
                                if (isEnabled && (actualBalance < oldBalance)) {
                                    showHideSpinner();
                                    chrome.runtime.sendMessage({message: 'getSelectedAmount'}, (selectedAmount) => {
                                        updateAmountFromRobot(selectedAmount);
                                        analysisPeriod = getRandomIntBetween(MIN_THINK_PERIOD_SEC, MAX_THINK_PERIOD_SEC);
                                        setTimeout(function() {
                                            betButton.click();
                                            makeActionsOfOverlap(); 
                                            showHideSpinner();
                                        }, analysisPeriod * 1000);
                                    });
                                }
                            }));
                        }, expirationTime * 1000 + 2500);
                    }, analysisPeriod * 1000);
                }
            }
        });
    });
}




