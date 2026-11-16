using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Library.Api.Controllers;

[ApiController]
[Route("api/books")]
public class BooksController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public BooksController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetBooks()
    {
        var connectionString =
            _configuration.GetConnectionString("Library");

        await using var connection =
            new SqlConnection(connectionString);

        var books = await connection.QueryAsync<BookDto>(
            """
            SELECT
                b.BookId,
                b.Title,
                b.PublicationYear,
                b.Price,
                b.DiscountPercent,
                CONCAT(a.FirstName, ' ', a.LastName) AS AuthorName
            FROM dbo.Books b
            LEFT JOIN dbo.Authors a
                ON a.AuthorId = b.AuthorId
            ORDER BY b.BookId
            """
        );

        return Ok(books);
    }
    
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetBookById(int id)
    {
        var connectionString =
            _configuration.GetConnectionString("Library");

        await using var connection =
            new SqlConnection(connectionString);

        var book = await connection.QuerySingleOrDefaultAsync<BookDto>(
            """
            SELECT
                b.BookId,
                b.Title,
                b.PublicationYear,
                b.Price,
                b.DiscountPercent,
                CONCAT(a.FirstName, ' ', a.LastName) AS AuthorName
            FROM dbo.Books b
            LEFT JOIN dbo.Authors a ON a.AuthorId = b.AuthorId
            WHERE b.BookId = @BookId
            """,
            new { BookId = id }
        );

        if (book is null)
        {
            return NotFound(new
            {
                Message = "Книгу не знайдено"
            });
        }

        var loans = await connection.QueryAsync<BookLoanDto>(
            """
            SELECT
                l.LoanId,
                l.LoanDate,
                l.LoanReturn,
                r.ReaderId,
                CONCAT(r.FirstName, ' ', r.LastName) AS ReaderName
            FROM dbo.Loans l
            JOIN dbo.Readers r ON r.ReaderId = l.ReaderId
            WHERE l.BookId = @BookId
            ORDER BY l.LoanDate DESC
            """,
            new { BookId = id }
        );

        return Ok(new
        {
            book.BookId,
            book.Title,
            book.PublicationYear,
            book.AuthorName,
            book.Price,
            book.DiscountPercent,
            Loans = loans
        });
    }
    
    [HttpPost("{id:int}/discount")]
    public async Task<IActionResult> ApplyDiscount(
        int id,
        [FromBody] DiscountRequest request)
    {
        var connectionString =
            _configuration.GetConnectionString("Library");

        await using var connection =
            new SqlConnection(connectionString);

        try
        {
            await connection.ExecuteAsync(
                "dbo.Task2",
                new
                {
                    BookId = id,
                    n = request.Percent
                },
                commandType: System.Data.CommandType.StoredProcedure
            );

            return Ok(new
            {
                Message = "Процедуру успішно виконано",
                BookId = id,
                Percent = request.Percent
            });
        }
        catch (SqlException ex) when (ex.Number == 50001)
        {
            return BadRequest(new
            {
                Message = ex.Message,
                ErrorCode = ex.Number
            });
        }
        catch (SqlException ex) when (ex.Number == 50002)
        {
            return NotFound(new
            {
                Message = ex.Message,
                ErrorCode = ex.Number
            });
        }
    }
    
}

public sealed record DiscountRequest(int Percent);

public sealed class BookDto
{
    public int BookId { get; set; }
    public string Title { get; set; } = "";
    public int PublicationYear { get; set; }
    public string AuthorName { get; set; } = "";
    public decimal? Price { get; set; }
    public int DiscountPercent { get; set; }
}

public sealed class BookLoanDto
{
    public int LoanId { get; set; }
    public DateTime LoanDate { get; set; }
    public DateTime? LoanReturn { get; set; }
    public int ReaderId { get; set; }
    public string ReaderName { get; set; } = "";
}