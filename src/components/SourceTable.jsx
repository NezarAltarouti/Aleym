import "/SourceTable.css"


export default function SourceTable() 
{
    
    const sources =  [
        {SourceName: "BBC", SourceID: "https://www.bbc.com/", NetworkingMethod:"tor", Fetcher: "Atom",Catagories: "CVE"},
        {SourceName: "CIO DIVE", SourceID: "https://www.ciodive.com/", NetworkingMethod:"Clear Net", Fetcher: "Atom",Catagories: "CyberSecurity"},
        {SourceName: "Asharq Al-awsat", SourceID: "https://aawsat.com/", NetworkingMethod:"Custom Proxy", Fetcher: "RSS",Catagories: "IOT"}
      ]

    return (
            <table> 
                <thead>
                    <tr className="TableHeader">
                        <th> Source Name </th>
                        <th> Source URL/ID</th>
                        <th> Networking Method</th>
                        <th> Fetcher</th>
                        <th> Categories</th>
                    </tr>
                </thead>
                    
                <tbody>
                {sources.map((val, key) => {
                return(
                    <tr key={key}>
                        <td>{val.SourceName}</td>
                        <td>{val.SourceID}</td>
                        <td>{val.NetworkingMethod}</td>
                        <td>{val.Fetcher}</td>
                        <td>{val.Catagories}</td>
                    </tr>
                )})}
                </tbody>
            </table>
    );
}