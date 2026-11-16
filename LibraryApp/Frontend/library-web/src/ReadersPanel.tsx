
import { useEffect, useState } from 'react'

interface Reader {
    readerId: number
    firstName: string
    lastName: string
    email: string | null
}

interface MostLoanedBook {
    bookTitle: string
    loanCount: number | null
}

interface FavoriteBookResponse {
    readerId: number
    favoriteBook: string
}

export default function ReadersPanel() {
    const [readers, setReaders] = useState<Reader[]>([])
    const [selectedReaderId, setSelectedReaderId] =
        useState<number | null>(null)

    const [favoriteBook, setFavoriteBook] =
        useState<string | null>(null)

    const [mostLoaned, setMostLoaned] =
        useState<MostLoanedBook[] | null>(null)

    const [loadingReaders, setLoadingReaders] = useState(true)
    const [loadingResults, setLoadingResults] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Загружаем читателей
    useEffect(() => {
        const controller = new AbortController()

        async function loadReaders() {
            try {
                const response = await fetch('/api/readers', {
                    signal: controller.signal,
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                const data: Reader[] = await response.json()
                setReaders(data)
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError('Не вдалося завантажити читачів')
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingReaders(false)
                }
            }
        }

        void loadReaders()

        return () => controller.abort()
    }, [])

    // Вызываем обе функции через REST API
    async function loadStatistics() {
        if (selectedReaderId === null || loadingResults) return

        setError(null)
        setFavoriteBook(null)
        setMostLoaned(null)
        setLoadingResults(true)

        try {
            const [tableResponse, scalarResponse] = await Promise.all([
                fetch(`/api/readers/${selectedReaderId}/most-loaned`),
                fetch(`/api/readers/${selectedReaderId}/favorite-book`),
            ])

            if (!tableResponse.ok || !scalarResponse.ok) {
                throw new Error('Не вдалося виконати SQL-функції')
            }

            const tableData: MostLoanedBook[] =
                await tableResponse.json()

            const scalarData: FavoriteBookResponse =
                await scalarResponse.json()

            setMostLoaned(tableData)
            setFavoriteBook(scalarData.favoriteBook)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Невідома помилка'
            )
        } finally {
            setLoadingResults(false)
        }
    }

    return (
        <section className="readers-panel">
            <h2>Статистика читачів</h2>

            <p>
                Виконання скалярної та табличної функцій SQL Server.
            </p>

            {loadingReaders && <p>Завантаження читачів...</p>}

            {!loadingReaders && (
                <div className="reader-controls">
                    <label htmlFor="reader-select">
                        Оберіть читача:
                    </label>

                    <select
                        id="reader-select"
                        value={selectedReaderId ?? ''}
                        disabled={loadingResults}
                        onChange={e => {
                            setSelectedReaderId(
                                e.target.value === ''
                                    ? null
                                    : Number(e.target.value)
                            )

                            setFavoriteBook(null)
                            setMostLoaned(null)
                            setError(null)
                        }}
                    >
                        <option value="">Оберіть читача</option>

                        {readers.map(reader => (
                            <option
                                key={reader.readerId}
                                value={reader.readerId}
                            >
                                {reader.firstName} {reader.lastName}
                                {' '}(ID: {reader.readerId})
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        disabled={
                            selectedReaderId === null ||
                            loadingResults
                        }
                        onClick={loadStatistics}
                    >
                        {loadingResults
                            ? 'Завантаження...'
                            : 'Отримати статистику'}
                    </button>
                </div>
            )}

            {!loadingReaders && readers.length === 0 && !error && (
                <p>Читачів не знайдено.</p>
            )}

            {error && (
                <p className="error" role="alert">{error}</p>
            )}

            {favoriteBook !== null && (
                <div className="reader-result">
                    <h3>Скалярна функція Task1Sk</h3>

                    <p>Найчастіше взята книга:</p>

                    <strong>{favoriteBook}</strong>
                </div>
            )}

            {mostLoaned !== null && (
                <div className="reader-result">
                    <h3>Таблична функція Task1</h3>

                    <table>
                        <thead>
                        <tr>
                            <th>Назва книги</th>
                            <th>Кількість видач</th>
                        </tr>
                        </thead>

                        <tbody>
                        {mostLoaned.map((book, index) => (
                            <tr key={index}>
                                <td>{book.bookTitle}</td>
                                <td>{book.loanCount ?? '—'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {mostLoaned.length === 0 && (
                        <p>Дані відсутні.</p>
                    )}
                </div>
            )}
        </section>
    )
}
