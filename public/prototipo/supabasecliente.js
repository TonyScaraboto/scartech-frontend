// Remova as linhas de import e export se estiver usando HTML simples
const supabaseUrl = 'https://siutrwucljacdkkqyxnp.supabase.co' // sua URL da imagem
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdXRyd3VjbGphY2Rra3F5eG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzEzNjgsImV4cCI6MjA5MDIwNzM2OH0.JwXLwVIzUgPZXLVzr5_51CYjuAMzHWnhPwZiII-2LIo' // sua Key da imagem

// O comando correto para o navegador é supabase.createClient
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

// Para facilitar o uso em outras funções do seu site:
window.supabase = supabaseClient