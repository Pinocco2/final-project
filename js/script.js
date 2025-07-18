document.addEventListener('DOMContentLoaded', () => {
    const eventLinks = document.querySelectorAll('.events__link');
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.modal__close');

    eventLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = link.parentElement.dataset.modal + '-modal';
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
                document.body.classList.add('body--modal-open--');
            }
        });
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
            document.body.classList.remove('body--modal-open--');
        });
    });

    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.classList.remove('body--modal-open--');
            }
        });
    });
});