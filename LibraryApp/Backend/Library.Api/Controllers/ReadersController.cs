using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Library.Api.Controllers;

[ApiController]
[Route("api/readers")]
public class ReadersController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public ReadersController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("{id:int}/favorite-book")]
    public async Task<IActionResult> GetFavoriteBook(int id)
    {
        var connectionString =
            _configuration.GetConnectionString("Library");

        await using var connection =
            new SqlConnection(connectionString);

        var bookTitle = await connection.ExecuteScalarAsync<string>(
            "SELECT dbo.Task1Sk(@ReaderId)",
            new { ReaderId = id }
        );

        return Ok(new
        {
            ReaderId = id,
            FavoriteBook = bookTitle
        });
    }
    
    [HttpGet]
    public async Task<IActionResult> GetReaders()
    {
        var connectionString =
            _configuration.GetConnectionString("Library");

        await using var connection =
            new SqlConnection(connectionString);

        var readers = await connection.QueryAsync<ReaderDto>(
            """
            SELECT
                ReaderId,
                FirstName,
                LastName,
                Email
            FROM dbo.Readers
            ORDER BY ReaderId
            """
        );

        return Ok(readers);
    }
    
    [HttpGet("{id:int}/most-loaned")]
    public async Task<IActionResult> GetMostLoanedBooks(int id)
    {
        var connectionString =
            _configuration.GetConnectionString("Library");

        await using var connection =
            new SqlConnection(connectionString);

        var result = await connection.QueryAsync<MostLoanedBookDto>(
            """
            SELECT BookTitle, LoanCount
            FROM dbo.Task1(@ReaderId)
            """,
            new { ReaderId = id }
        );

        return Ok(result);
    }
}

public sealed class MostLoanedBookDto
{
    public string BookTitle { get; set; } = "";
    public int? LoanCount { get; set; }
}

public sealed class ReaderDto
{
    public int ReaderId { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
}