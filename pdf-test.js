// pdf-test.js
const ReactPDF = require('@react-pdf/renderer');
const React = require('react');

// Create a simple PDF component
const MyDocument = () => React.createElement(ReactPDF.Document, null,
  React.createElement(ReactPDF.Page, { 
    size: "A4", 
    style: { padding: 30, backgroundColor: '#f8fafc' } 
  }, 
    React.createElement(ReactPDF.Text, { 
      style: { fontSize: 24, marginBottom: 20 } 
    }, "✅ React-PDF Works!"),
    React.createElement(ReactPDF.Text, { 
      style: { fontSize: 14, color: '#64748b' } 
    }, "Generated on: " + new Date().toLocaleDateString()),
    React.createElement(ReactPDF.View, {
      style: { marginTop: 20, padding: 10, backgroundColor: '#3b82f6', borderRadius: 5 }
    },
      React.createElement(ReactPDF.Text, {
        style: { color: 'white', fontSize: 12 }
      }, "This proves you have full control over:")
    ),
    React.createElement(ReactPDF.Text, {
      style: { marginTop: 15, fontSize: 12 }
    }, "• Page breaks\n• Colors & backgrounds\n• Fonts & styling\n• Layouts\n• And everything visual")
  )
);

// Generate and save the PDF
async function generatePDF() {
  try {
    console.log('🔄 Creating PDF...');
    
    const stream = await ReactPDF.renderToStream(MyDocument());
    const fs = require('fs');
    const path = require('path');
    
    const outputPath = path.join(process.cwd(), 'TEST-SUCCESS.pdf');
    const writeStream = fs.createWriteStream(outputPath);
    
    stream.pipe(writeStream);
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`\n✅ SUCCESS! PDF created at:`);
        console.log(`📄 ${outputPath}`);
        console.log(`\n📁 Open this file to see your PDF.`);
        console.log(`\n🎉 React-PDF is ready to use with Dyad + React!`);
        resolve(true);
      });
      
      writeStream.on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('React')) {
      console.log('\n🔧 Try this fix:');
      console.log('pnpm add react@18.2.0 react-dom@18.2.0');
    }
    return false;
  }
}

// Run it
generatePDF();