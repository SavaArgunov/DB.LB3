
import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import ReadersPanel from './ReadersPanel'

interface Book {
  bookId: number
  title: string
  publicationYear: number
  authorName: string
  price: number | null
  discountPercent: number
}

interface BookLoan {
  loanId: number
  loanDate: string
  loanReturn: string | null
  readerId: number
  readerName: string
}

interface BookDetails extends Book {
  loans: BookLoan[]
}

interface ApiMessage {
  message?: string
  errorCode?: number
}

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<BookDetails | null>(null)

  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [discount, setDiscount] = useState('15')
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [discountSuccess, setDiscountSuccess] = useState<string | null>(null)

  // Загружаем каталог при открытии страницы
  useEffect(() => {
    const controller = new AbortController()

    async function loadBooks() {
      try {
        const response = await fetch('/api/books', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: Book[] = await response.json()
        setBooks(data)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError('Не вдалося завантажити книги')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadBooks()

    return () => controller.abort()
  }, [])

  // Загружаем подробности выбранной книги
  useEffect(() => {
    if (selectedId === null) {
      setDetails(null)
      setDetailsLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadDetails() {
      setDetails(null)
      setError(null)
      setDetailsLoading(true)

      try {
        const response = await fetch(`/api/books/${selectedId}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: BookDetails = await response.json()
        setDetails(data)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError('Не вдалося завантажити інформацію про книгу')
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailsLoading(false)
        }
      }
    }

    void loadDetails()

    return () => controller.abort()
  }, [selectedId])

  // Выбираем книгу и очищаем сообщения предыдущей
  function selectBook(id: number) {
    setSelectedId(id)
    setDiscount('15')
    setDiscountError(null)
    setDiscountSuccess(null)
  }

  // Вызываем хранимую процедуру Task2 через REST API
  async function applyDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedId === null || discountLoading) return

    setDiscountError(null)
    setDiscountSuccess(null)

    if (
        discount.trim() === '' ||
        !Number.isInteger(Number(discount))
    ) {
      setDiscountError('Введіть ціле число')
      return
    }

    setDiscountLoading(true)

    try {
      // 1. Вызываем SQL-процедуру через REST API
      const response = await fetch(
          `/api/books/${selectedId}/discount`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              percent: Number(discount),
            }),
          }
      )

      const data = await response.json()

      // 2. Обрабатываем ошибки SQL Server
      if (!response.ok) {
        throw new Error(
            data.message || `HTTP ${response.status}`
        )
      }

      // 3. После успешного изменения получаем обновлённую книгу
      const updatedResponse = await fetch(
          `/api/books/${selectedId}`
      )

      if (!updatedResponse.ok) {
        throw new Error('Не вдалося оновити інформацію про книгу')
      }

      const updatedBook: BookDetails = await updatedResponse.json()

      // 4. Обновляем информацию в React
      setDetails(current =>
          current?.bookId === selectedId ? updatedBook : current
      )

      // 5. Показываем сообщение об успехе
      setDiscountSuccess(
          data.message || 'Знижку успішно застосовано'
      )

    } catch (err) {
      setDiscountError(
          err instanceof Error
              ? err.message
              : 'Невідома помилка'
      )
    } finally {
      setDiscountLoading(false)
    }
  }

  return (
      <main className="container">
        <header>
          <h1>Library Management</h1>
          <p>Система управління бібліотекою</p>
        </header>

        {/* Каталог книг */}
        <section>
          <h2>Каталог книг</h2>

          {loading && <p>Завантаження книг...</p>}

          {error && <p className="error">{error}</p>}

          {!loading && !error && books.length === 0 && (
              <p>Книг поки немає.</p>
          )}

          {!loading && books.length > 0 && (
              <table>
                <thead>
                <tr>
                  <th>ID</th>
                  <th>Назва</th>
                  <th>Автор</th>
                  <th>Рік</th>
                  <th>Дії</th>
                </tr>
                </thead>

                <tbody>
                {books.map(book => (
                    <tr key={book.bookId}>
                      <td>{book.bookId}</td>
                      <td>{book.title}</td>
                      <td>{book.authorName}</td>
                      <td>{book.publicationYear}</td>

                      <td>
                        {book.price != null
                            ? `${book.price.toFixed(2)} грн`
                            : 'Не вказана'}
                      </td>

                      <td>
                        <button
                            type="button"
                            onClick={() => selectBook(book.bookId)}
                        >
                          Детальніше
                        </button>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </section>

        {/* Загрузка подробностей */}
        {detailsLoading && (
            <p>Завантаження інформації про книгу...</p>
        )}

        {/* Подробности выбранной книги */}
        {details && (
            <section className="details">
              <h2>{details.title}</h2>

              <p>
                <strong>Автор:</strong> {details.authorName}
              </p>

              <p>
                <strong>Рік видання:</strong> {details.publicationYear}
              </p>

              <div className="price-panel">
                <h3>Вартість книги</h3>

                {details.price != null ? (
                    <>
                      <p>
                        <strong>Початкова ціна:</strong>{' '}
                        {details.price.toFixed(2)} грн
                      </p>

                      <p>
                        <strong>Знижка:</strong>{' '}
                        {details.discountPercent}%
                      </p>

                      <h3>
                        Підсумкова ціна:{' '}
                        {(
                            details.price *
                            (1 - details.discountPercent / 100)
                        ).toFixed(2)} грн
                      </h3>
                    </>
                ) : (
                    <p>Ціна не вказана</p>
                )}
              </div>

              {/* Форма вызова процедуры */}
              <div className="discount-panel">
                <h3>Керування знижкою</h3>

                <form onSubmit={applyDiscount}>
                  <label htmlFor="discount">
                    Відсоток знижки:
                  </label>

                  <input
                      id="discount"
                      type="number"
                      step="1"
                      value={discount}
                      onChange={e => {
                        setDiscount(e.target.value)
                        setDiscountError(null)
                        setDiscountSuccess(null)
                      }}
                  />


                  <button
                      type="submit"
                      disabled={discountLoading}
                  >
                    {discountLoading
                        ? 'Застосування...'
                        : 'Застосувати знижку'}
                  </button>
                </form>

                {discountError && (
                    <p className="error" role="alert">
                      {discountError}
                    </p>
                )}

                {discountSuccess && (
                    <p className="success" role="status">
                      {discountSuccess}
                    </p>
                )}
              </div>

              {/* История выдач */}
              <h3>Історія видач</h3>

              {details.loans.length === 0 ? (
                  <p>Книгу ще не видавали.</p>
              ) : (
                  <table>
                    <thead>
                    <tr>
                      <th>Читач</th>
                      <th>Дата видачі</th>
                      <th>Дата повернення</th>
                    </tr>
                    </thead>

                    <tbody>
                    {details.loans.map(loan => (
                        <tr key={loan.loanId}>
                          <td>{loan.readerName}</td>

                          <td>
                            {new Date(
                                loan.loanDate
                            ).toLocaleDateString('uk-UA')}
                          </td>

                          <td>
                            {loan.loanReturn
                                ? new Date(
                                    loan.loanReturn
                                ).toLocaleDateString('uk-UA')
                                : 'Не повернуто'}
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
              )}

              <button
                  type="button"
                  onClick={() => setSelectedId(null)}
              >
                Закрити
              </button>
            </section>
        )}
        <ReadersPanel />
      </main>
  )
}

export default App
