document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const editorPanels = document.querySelectorAll('.editor-panel');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
  
        tabButtons.forEach(btn => btn.classList.remove('active'));
        editorPanels.forEach(panel => panel.classList.remove('active'));
  
        button.classList.add('active');
        document.getElementById(`${tab}-editor-panel`).classList.add('active');
      });
    });
  
    document.getElementById('run-code').addEventListener('click', () => {
      const htmlCode = document.getElementById('html-editor').value;
      const cssCode = `<style>${document.getElementById('css-editor').value}</style>`;
      const jsCode = `<script>${document.getElementById('js-editor').value}<\/script>`;
  
      const iframe = document.getElementById('preview');
      iframe.contentDocument.open();
      iframe.contentDocument.write(htmlCode + cssCode + jsCode);
      iframe.contentDocument.close();
    });
  });
  
